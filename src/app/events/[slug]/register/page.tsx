'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event, EventResponseData } from '@/lib/db';
import { isTeamNameAvailable, verifyTeamId } from '@/lib/team-logic';
import { EventRegistrationCard } from '@/components/events/EventRegistrationCard';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, UserCircle2, Users, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';
import { DynamicForm } from '@/components/events/DynamicForm';
import { cn } from '@/lib/utils';

export default function EventRegistrationPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userProfile, loading: authLoading } = useAuth();
    const eventId = params.slug as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);

    // --- State Management ---
    const [response, setResponse] = useState<EventResponseData>({
        isTeamLeader: false,
        teamName: '',
        teamId: '',
        teamMembers: [],
        customResponses: {}
    });

    useEffect(() => {
        // 1. Wait for Auth
        if (authLoading) return;

        // 2. Redirect/Error if not logged in
        if (!user) {
            toast.error("Please login to register");
            router.push('/');
            return;
        }

        // 3. Handle missing event ID
        if (!eventId) {
            console.error("No Event ID found");
            setLoading(false);
            return;
        }

        const init = async () => {
            try {
                // 4. Fetch Event
                const eventSnap = await getDoc(doc(db, 'events', eventId));
                if (!eventSnap.exists()) {
                    setLoading(false); // Stop loading to show "Not Found" UI
                    return;
                }
                const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
                setEvent(eventData);

                // 5. Check Existing Registration
                const q = query(
                    collection(db, 'events', eventId, 'registrations'),
                    where('userId', '==', user.uid)
                );
                const regSnap = await getDocs(q);
                if (!regSnap.empty) {
                    // Only block if they have a SUCCESSFUL or FREE registration
                    const hasActiveReg = regSnap.docs.some(d => {
                        const data = d.data();
                        return data.paymentStatus === 'success' || data.paymentStatus === 'free' || data.paymentStatus === 'success'; // Legacy support corrected
                    });
                    if (hasActiveReg) {
                        setAlreadyRegistered(true);
                    }
                }

                // 6. Load User Profile
                if (userProfile) {
                    // (Logic omitted: setPersonalDetails is not used in render anyway? 
                    // Actually it was used in `personalDetails` state which was removed in my refactor? 
                    // Wait, `personalDetails` state DOES NOT EXIST in the file view I just saw.
                    // Good, I can skip it.)
                }

            } catch (error) {
                console.error("Error loading event logic:", error);
                toast.error("Failed to load details");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [user, authLoading, eventId, userProfile, router]);


    // --- Helpers ---
    const updateResponse = (field: keyof EventResponseData, value: any) => {
        setResponse(prev => ({ ...prev, [field]: value }));
    };

    const updateCustomResponse = (field: string, value: any) => {
        setResponse(prev => ({
            ...prev,
            customResponses: { ...prev.customResponses, [field]: value }
        }));
    };

    // --- Pricing Logic ---
    const getPricing = () => {
        if (!event) return 0;
        return event.entryFeeInr || 0;
    };

    const handleRegister = async () => {
        if (!user || !event) return;
        setSubmitting(true);

        try {
            // 1. Team Validation
            if (event.maxTeamSize > 1 || event.minTeamSize > 1) {
                if (response.isTeamLeader) {
                    if (!response.teamName?.trim()) throw "Team Name is required.";
                    const isAvailable = await isTeamNameAvailable(event.id!, response.teamName.trim());
                    if (!isAvailable) throw `Team Name '${response.teamName}' is already taken.`;
                } else {
                    if (!response.teamId?.trim()) throw "Team ID is required.";
                    await verifyTeamId(event.id!, response.teamId.trim());
                }
            } else if (event.formConfig?.askTeamName && !response.teamName) {
                throw "Team Name is required.";
            }

            // Custom fields validation
            if (event.formConfig?.customFields) {
                for (const f of event.formConfig.customFields) {
                    if (f.required && !response.customResponses?.[f.id]) throw `${f.label} is required`;
                }
            }

            const amount = getPricing();
            const registrationData = {
                eventId: event.id,
                userId: user.uid,
                paymentStatus: amount > 0 ? 'pending' : 'completed',
                status: 'active',
                userSnapshot: {
                    fullName: userProfile?.fullName || user.displayName || 'Student',
                    regNo: userProfile?.registrationNumber || '',
                    mobileNumber: userProfile?.mobileNumber || '',
                    email: user.email || ''
                },
                responses: {
                    teamName: response.teamName,
                    ...response.customResponses
                },
                teamId: response.teamId,
                role: response.isTeamLeader ? 'Leader' : 'Member',
                amount,
                createdAt: serverTimestamp()
            };

            if (amount === 0) {
                await addDoc(collection(db, 'events', event.id!, 'registrations'), registrationData);

                if (response.isTeamLeader && (event.maxTeamSize > 1)) {
                    const { createTeam } = await import('@/lib/team-logic');
                    await createTeam(event.id!, response.teamName!, {
                        uid: user.uid, name: registrationData.userSnapshot.fullName, regNo: registrationData.userSnapshot.regNo
                    }, event.maxTeamSize);
                } else if (response.teamId) {
                    const { joinTeam } = await import('@/lib/team-logic');
                    await joinTeam(response.teamId, {
                        uid: user.uid, name: registrationData.userSnapshot.fullName, regNo: registrationData.userSnapshot.regNo
                    });
                }

                toast.success("Registered Successfully!");
                router.push(`/dashboard`);
                return;
            }

            // Paid Flow
            const orderId = `EVT_${event.id}_${user.uid}_${Date.now()}`;
            const payRes = await fetch('/api/paytm/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount.toString(),
                    email: user.email,
                    phone: userProfile?.mobileNumber || '9999999999',
                    studentName: userProfile?.fullName || 'Student',
                    orderId,
                    userId: user.uid,
                    eventIds: [event.id]
                })
            });

            const data = await payRes.json();
            if (!data.success) throw new Error(data.message || "Payment init failed");

            await addDoc(collection(db, 'events', event.id!, 'registrations'), { ...registrationData, orderId });

            const paytmUrl = `https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${orderId}`;
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = paytmUrl;
            const addField = (n: string, v: string) => {
                const i = document.createElement('input');
                i.type = 'hidden'; i.name = n; i.value = v;
                form.appendChild(i);
            };
            addField('mid', data.mid);
            addField('orderId', orderId);
            addField('txnToken', data.txnToken);
            document.body.appendChild(form);
            form.submit();

        } catch (error: any) {
            console.error(error);
            toast.error(typeof error === 'string' ? error : error.message || "Registration Failed");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <p className="text-sm text-gray-500 font-medium">Loading Event Details...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-sm text-center">
                    <h3 className="font-bold text-lg mb-2">Event Not Found</h3>
                    <p className="text-sm mb-4">We couldn't find the event you're looking for.</p>
                    <Button onClick={() => router.push('/dashboard')}>Go Home</Button>
                </div>
            </div>
        );
    }

    return (
        <RoyalFormLayout
            title={event.title}
            subtitle={alreadyRegistered ? "You are already registered" : "Complete your registration"}
            showStep={false}
        >
            {alreadyRegistered ? (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">You're In!</h2>
                    <p className="text-gray-500 mb-8">You have already registered for this event.</p>
                    <Button onClick={() => router.push('/dashboard')} className="bg-slate-900 text-white">Go to Dashboard</Button>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

                    {/* Reusing the Standard Card Component */}
                    <div className="space-y-6">
                        <EventRegistrationCard
                            event={event}
                            response={response}
                            onUpdate={updateResponse}
                            onUpdateCustom={updateCustomResponse}
                            onMemberChange={() => { }}
                            onAddMember={() => { }}
                            onRemoveMember={() => { }}
                        />
                    </div>

                    {/* Checkout Card (Onboarding Style) */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h2>
                            <p className="text-sm text-gray-500">Review your details before payment</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {/* Registration Fee */}
                                    <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200">
                                        <div className="text-left">
                                            <div className="font-bold text-gray-900 text-sm">Event Registration</div>
                                            <div className="text-xs text-gray-500">{event.title}</div>
                                        </div>
                                        <div className="font-medium text-gray-900">
                                            {getPricing() === 0 ? "FREE" : `₹${getPricing()}`}
                                        </div>
                                    </div>

                                    {/* Team Info Snippet */}
                                    {event.minTeamSize > 1 && (
                                        <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200">
                                            <div className="text-left">
                                                <div className="font-bold text-gray-900 text-sm">Team Status</div>
                                                <div className="text-xs text-gray-500">
                                                    {response.isTeamLeader
                                                        ? `Creating Team: ${response.teamName || '...'}`
                                                        : `Joining Team: ${response.teamId || '...'}`
                                                    }
                                                </div>
                                            </div>
                                            <div className="font-medium text-gray-900 text-xs bg-slate-100 px-2 py-1 rounded">
                                                {response.isTeamLeader ? 'Leader' : 'Member'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-end pt-2">
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Payable</div>
                                    </div>
                                    <div className="text-4xl font-black text-gray-900">
                                        {getPricing() === 0 ? "FREE" : `₹${getPricing()}`}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleRegister}
                                    size="lg"
                                    className="w-full bg-red-600 hover:bg-red-700 font-bold py-6 text-lg rounded-xl shadow-lg shadow-red-200 transition-all hover:scale-[1.01]"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    {submitting ? "Processing..." : (getPricing() === 0 ? "Confirm Registration" : "Proceed to Pay")}
                                </Button>
                            </div>
                        </div>

                        {/* Testing Mode Alert */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="text-sm text-yellow-800">
                                <p className="font-bold mb-1">Secure Payment</p>
                                <p>You will be redirected to Paytm Gateway to complete the transaction.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </RoyalFormLayout>
    );
}

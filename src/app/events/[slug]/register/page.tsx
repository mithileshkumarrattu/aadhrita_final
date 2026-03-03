'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event, EventResponseData } from '@/lib/db';
import { isTeamNameAvailable, verifyTeamId } from '@/lib/team-service';
import { EventRegistrationCard } from '@/components/events/EventRegistrationCard';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';

export default function EventRegistrationPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userProfile, loading: authLoading } = useAuth();
    const eventId = params.slug as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);
    const [noEntryPass, setNoEntryPass] = useState(false);

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

        // 2.5 Check Entry Pass
        // If profile is missing OR hasEntryPass is false/undefined, block them.
        // Removed admin bypass to ensure strict testing/flow.
        if (!userProfile || !userProfile.hasEntryPass) {
            setNoEntryPass(true);
            setLoading(false);
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
                        return data.paymentStatus === 'success' || data.paymentStatus === 'free' || data.paymentStatus === 'completed';
                    });
                    if (hasActiveReg) {
                        setAlreadyRegistered(true);
                    }
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

            // --- FINAL SAFETY CHECK (Duplicate) ---
            const qCheck = query(collection(db, 'events', event.id!, 'registrations'), where('userId', '==', user.uid));
            const snapCheck = await getDocs(qCheck);
            const isAhreadyDone = snapCheck.docs.some(d => {
                const p = d.data().paymentStatus;
                return p === 'success' || p === 'free' || p === 'completed';
            });
            if (isAhreadyDone) {
                toast.error("You are already registered for this event!");
                router.replace('/dashboard');
                return;
            }

            // Custom fields validation
            if (event.formConfig?.customFields) {
                for (const f of event.formConfig.customFields) {
                    if (f.required && !response.customResponses?.[f.id]) throw `${f.label} is required`;
                }
            }

            let finalTeamId = response.teamId || null;
            let finalTeamName = response.teamName || null;

            // 2. Team Creation / Joining (MUST happen before payment logic)
            if (response.isTeamLeader && (event.maxTeamSize > 1)) {
                const { createTeam } = await import('@/lib/team-service');
                const result = await createTeam(event.id!, response.teamName!, {
                    userId: user.uid,
                    name: userProfile?.fullName || user.displayName || 'Student',
                    regNo: userProfile?.registrationNumber || ''
                }, event.maxTeamSize);

                if (result.success && result.teamId) {
                    finalTeamId = result.teamId;
                    finalTeamName = response.teamName!;
                } else {
                    throw result.error || "Failed to create team";
                }
            } else if (response.teamId) {
                const { joinTeam } = await import('@/lib/team-service');
                const result = await joinTeam(event.id!, response.teamId, {
                    userId: user.uid,
                    name: userProfile?.fullName || user.displayName || 'Student',
                    regNo: userProfile?.registrationNumber || ''
                });

                if (result.success && result.teamName) {
                    finalTeamId = result.resolvedTeamId || response.teamId;
                    finalTeamName = result.teamName;
                } else {
                    throw result.error || "Failed to join team";
                }
            }

            const amount = getPricing();
            const registrationData = {
                eventId: event.id,
                userId: user.uid,
                paymentStatus: amount > 0 ? 'pending' : 'completed',
                status: 'active',
                responses: {
                    teamName: finalTeamName,
                    ...response.customResponses
                },
                teamId: finalTeamId,
                role: response.isTeamLeader ? 'Leader' : 'Member',
                amount,
                createdAt: serverTimestamp()
            };

            if (amount === 0) {
                // IMPORTANT: Use setDoc to prevent duplicate ghost records for the same user + event
                const { doc, setDoc } = await import('firebase/firestore');
                await setDoc(doc(db, 'events', event.id!, 'registrations', user.uid), registrationData);

                toast.success("Registered Successfully!");
                router.push(`/dashboard`);
                return;
            }

            // Paid Flow
            // Short Order ID for Paytm (Max 50 chars, safe < 30)
            const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5 chars
            const orderId = `EVT_${Date.now()}_${uniqueSuffix}`; // EVT_13chars_5chars = ~22 chars

            const paymentAbort = new AbortController();
            const paymentTimeout = setTimeout(() => paymentAbort.abort(), 15000);

            let payRes: Response;
            try {
                payRes = await fetch('/api/paytm/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: paymentAbort.signal,
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
            } catch (fetchErr: any) {
                if (fetchErr.name === 'AbortError') {
                    throw new Error('Payment gateway is temporarily unreachable. Please check your internet connection and try again.');
                }
                throw fetchErr;
            } finally {
                clearTimeout(paymentTimeout);
            }

            const data = await payRes.json();
            if (!data.success) throw new Error(data.message || "Payment init failed");

            // IMPORTANT: Use setDoc to prevent duplicate ghost records for the same user + event, 
            // especially if they abandon payment and try again
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'events', event.id!, 'registrations', user.uid), { ...registrationData, orderId });

            // --- Payment Redirect (UPI QR Mode) ---
            if (data.deepLink) {
                window.location.href = data.deepLink;
                return;
            }

            const baseUrl = process.env.NODE_ENV === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
            const paytmUrl = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${orderId}&txnToken=${data.txnToken}`;
            window.location.href = paytmUrl;
            return;

        } catch (error: any) {
            console.error(error);
            toast.error(typeof error === 'string' ? error : error.message || "Registration Failed");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#050505]">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <p className="text-sm text-gray-500 font-medium">Loading Event Details...</p>
            </div>
        );
    }

    if (noEntryPass) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#050505] text-white">

                <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
                    {/* ... existing blocking UI ... */}
                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />

                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                        <CreditCard className="w-8 h-8" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black uppercase text-white mb-2">Entry Pass Required</h2>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            You need an active entry pass to register for this event.
                            Please complete your onboarding and get an entry pass first.
                        </p>
                    </div>

                    <Button
                        onClick={() => router.push('/dashboard')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-sm uppercase tracking-wide rounded-xl shadow-lg shadow-red-900/40"
                    >
                        Get Entry Pass
                    </Button>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#050505]">
                <div className="bg-zinc-900 text-red-600 p-6 rounded-xl border border-red-900/50 max-w-sm text-center">
                    <h3 className="font-bold text-lg mb-2">Event Not Found</h3>
                    <p className="text-sm mb-4 text-zinc-400">We couldn't find the event you're looking for.</p>
                    <Button onClick={() => router.push('/dashboard')} variant="outline" className="border-zinc-700 text-zinc-300">Go Home</Button>
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
            <Script
                id="paytm-checkoutjs-event"
                src="https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/Resell00448805757124.js"
                strategy="lazyOnload"
            />

            {alreadyRegistered ? (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/20 text-green-500 mb-6 border border-green-900/30">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">You're In!</h2>
                    <p className="text-neutral-400 mb-8">You have already registered for this event.</p>
                    <Button onClick={() => router.push('/dashboard')} className="bg-white text-black hover:bg-neutral-200">Go to Dashboard</Button>
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
                            <h2 className="text-2xl font-bold text-white mb-1">Checkout</h2>
                            <p className="text-sm text-neutral-400">Review your details before payment</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {/* Registration Fee */}
                                    <div className="flex justify-between items-center pb-4 border-b border-dashed border-white/10">
                                        <div className="text-left">
                                            <div className="font-bold text-white text-sm">Event Registration</div>
                                            <div className="text-xs text-neutral-500">{event.title}</div>
                                        </div>
                                        <div className="font-medium text-white">
                                            {getPricing() === 0 ? "FREE" : `₹${getPricing()}`}
                                        </div>
                                    </div>

                                    {/* Team Info Snippet */}
                                    {event.minTeamSize > 1 && (
                                        <div className="flex justify-between items-center pb-4 border-b border-dashed border-white/10">
                                            <div className="text-left">
                                                <div className="font-bold text-white text-sm">Team Status</div>
                                                <div className="text-xs text-neutral-500">
                                                    {response.isTeamLeader
                                                        ? `Creating Team: ${response.teamName || '...'}`
                                                        : `Joining Team: ${response.teamId || '...'}`
                                                    }
                                                </div>
                                            </div>
                                            <div className="font-medium text-neutral-300 text-xs bg-white/10 px-2 py-1 rounded">
                                                {response.isTeamLeader ? 'Leader' : 'Member'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-end pt-2">
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Total Payable</div>
                                    </div>
                                    <div className="text-4xl font-black text-white">
                                        {getPricing() === 0 ? "FREE" : `₹${getPricing()}`}
                                    </div>
                                </div>

                                {/* Payment Warning Banner — industry standard */}
                                {getPricing() > 0 && (
                                    <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
                                        <span className="text-amber-400 text-lg mt-0.5 shrink-0">⚠️</span>
                                        <div className="text-sm text-amber-300">
                                            <p className="font-bold mb-1">Important — Please Read Before Paying</p>
                                            <ul className="space-y-0.5 text-amber-400/90 text-xs list-disc list-inside">
                                                <li>Do <strong>NOT</strong> close the payment app until you see the success screen.</li>
                                                <li>Do <strong>NOT</strong> press the back button during payment.</li>
                                                <li>Do <strong>NOT</strong> refresh this page while payment is in progress.</li>
                                                <li>Wait for the page to redirect automatically after completion.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleRegister}
                                    size="lg"
                                    className="w-full bg-red-600 hover:bg-red-700 font-bold py-6 text-lg rounded-xl shadow-lg shadow-red-500/20 transition-all hover:scale-[1.01]"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    {submitting ? "Processing..." : (getPricing() === 0 ? "Confirm Registration" : "Proceed to Pay")}
                                </Button>
                            </div>
                        </div>

                        {/* UPI / Paytm accepted note */}
                        <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-4 flex items-start gap-3">
                            <div className="text-sm text-amber-400">
                                <p className="font-bold mb-1">Secure Payment</p>
                                <p>You will be redirected to Paytm Gateway to complete the transaction. UPI, cards and net banking accepted.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </RoyalFormLayout>
    );
}

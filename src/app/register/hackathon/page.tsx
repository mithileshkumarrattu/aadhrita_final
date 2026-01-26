'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, HackathonTeam } from '@/lib/db';
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2, Trophy, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Simplified Config based on Request
const STEPS = [
    { id: 1, title: 'Team Confirmation' },
    { id: 2, title: 'Final Review' },
    { id: 3, title: 'Secure Seat' }
];

export default function HackathonFinalRegisterPage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [loading, setLoading] = React.useState(true);
    const [teamData, setTeamData] = React.useState<HackathonTeam | null>(null);
    const [currentStep, setCurrentStep] = React.useState(1);
    const [paymentLoading, setPaymentLoading] = React.useState(false);

    React.useEffect(() => {
        const checkEligibility = async () => {
            if (!user?.email) return;
            try {
                // Fetch Team Data
                const q = query(
                    collection(db, 'hackathon_teams'),
                    where('leader.email', '==', user.email)
                );
                const snap = await getDocs(q);

                if (snap.empty) {
                    setTeamData(null); // No team found
                } else {
                    const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as HackathonTeam;
                    setTeamData(data);
                }
            } catch (error) {
                console.error("Fetch Error", error);
                toast.error("Failed to load team data");
            } finally {
                setLoading(false);
            }
        };
        checkEligibility();
    }, [user]);

    const handlePayment = async () => {
        if (!teamData || !user) return;
        setPaymentLoading(true);

        try {
            const orderId = `HACK_FINAL_${teamData.id}_${Date.now()}`;
            const amount = "500"; // Fixed Fee as per flow

            const response = await fetch('/api/paytm/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    email: user.email,
                    phone: userProfile?.mobileNumber,
                    studentName: userProfile?.fullName,
                    orderId,
                    userId: user.uid,
                    eventIds: ['HACKATHON'] // Triggers the Callback logic we wrote
                })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message || "Gateway Error");

            // Submit Form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${data.orderId}`;

            const addField = (n: string, v: string) => {
                const i = document.createElement('input');
                i.type = 'hidden';
                i.name = n;
                i.value = v;
                form.appendChild(i);
            };

            addField('mid', data.mid);
            addField('orderId', data.orderId);
            addField('txnToken', data.txnToken);

            document.body.appendChild(form);
            form.submit();

        } catch (error: any) {
            toast.error(error.message);
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
    }

    // --- State: Not Selected or Not Found ---
    if (!teamData || teamData.status !== 'approved') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Lock className="w-8 h-8 text-neutral-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
                    <p className="text-neutral-400">
                        {teamData
                            ? "Your team is currently under review. Please wait for the results."
                            : "No Hackathon registration found for your account."}
                    </p>
                    <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full mt-4">Return to Dashboard</Button>
                </div>
            </div>
        );
    }

    // --- State: Already Paid ---
    if (teamData.paymentStatus === 'paid') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-green-900/20 to-neutral-900 border border-green-500/30 p-8 rounded-2xl max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Seat Confirmed!</h2>
                    <p className="text-neutral-300">
                        Team <b>{teamData.teamName}</b> is successfully registered for the Grand Finale.
                    </p>
                    <Button onClick={() => router.push('/dashboard')} className="w-full mt-4 bg-green-600 hover:bg-green-700 font-bold">Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <RoyalFormLayout
            title="Grand Finale Registration"
            subtitle="Secure your spot for the ultimate showdown"
            showStep={true} currentStep={currentStep} totalSteps={3} steps={STEPS.map(s => s.title)}
        >
            {/* Step 1: Team Confirmation (Read Only) */}
            {currentStep === 1 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl flex items-start gap-4">
                        <Trophy className="w-8 h-8 text-yellow-500 shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-yellow-500 text-lg">Congratulations!</h3>
                            <p className="text-yellow-200/80 text-sm mt-1">
                                Your team <b>{teamData.teamName}</b> has been shortlisted based on your abstract submission. Verify your details below to proceed.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Team Details</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><Label className="text-xs text-gray-500 uppercase font-bold">Team Name</Label><Input value={teamData.teamName} disabled className="mt-1 bg-gray-50 font-medium text-gray-900" /></div>
                            <div><Label className="text-xs text-gray-500 uppercase font-bold">Team Size</Label><Input value={`${teamData.teamSize} Members`} disabled className="mt-1 bg-gray-50 text-gray-900" /></div>
                            <div className="md:col-span-2">
                                <Label className="text-xs text-gray-500 uppercase font-bold">Project Title (PPT)</Label>
                                <Input value={teamData.pptTitle || "Not Specified"} disabled className="mt-1 bg-gray-50 text-gray-900" />
                            </div>
                        </div>
                    </div>

                    <Button onClick={() => setCurrentStep(2)} className="w-full h-12 text-lg font-bold bg-black text-white hover:bg-neutral-800">
                        Next: Review Members <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Step 2: Member Review (Read Only) */}
            {currentStep === 2 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Team Leader</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><Label className="text-xs text-gray-500 uppercase font-bold">Name</Label><div className="font-medium">{teamData.leader.name}</div></div>
                            <div><Label className="text-xs text-gray-500 uppercase font-bold">Reg No</Label><div className="font-mono text-sm">{teamData.leader.regNo}</div></div>
                            <div><Label className="text-xs text-gray-500 uppercase font-bold">Phone</Label><div>{teamData.leader.phone}</div></div>
                            <div><Label className="text-xs text-gray-500 uppercase font-bold">Email</Label><div className="text-sm truncate">{teamData.leader.email}</div></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Team Members ({teamData.members.length})</h3>
                        {teamData.members.map((member: any, i: number) => (
                            <div key={i} className="grid md:grid-cols-2 gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                <div><Label className="text-xs text-gray-500 uppercase font-bold">Member {i + 2}</Label><div className="font-medium">{member.name}</div></div>
                                <div className="mt-auto"><div className="font-mono text-xs text-gray-600">{member.regNo}</div></div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => setCurrentStep(1)}>Back</Button>
                        <Button onClick={() => setCurrentStep(3)} className="flex-1 h-12 text-lg font-bold bg-black text-white hover:bg-neutral-800">
                            Proceed to Payment <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
                <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />

                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Grand Finale Pass</h2>
                            <p className="text-sm text-gray-500">One-time team registration fee</p>
                        </div>

                        <div className="flex justify-between items-center py-4 border-b border-dashed border-gray-200">
                            <div className="text-left font-medium text-gray-700">Registration Fee</div>
                            <div className="font-bold text-xl text-gray-900">₹500</div>
                        </div>

                        <div className="flex justify-between items-end pt-4 mb-6">
                            <div className="text-left text-sm font-bold text-gray-500 uppercase tracking-widest">Total Payable</div>
                            <div className="text-4xl font-black text-gray-900">₹500</div>
                        </div>

                        <Button
                            onClick={handlePayment}
                            disabled={paymentLoading}
                            className="w-full h-14 text-xl font-bold bg-black hover:bg-gray-900 text-white shadow-lg shadow-gray-200 transition-all active:scale-[0.98]"
                        >
                            {paymentLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Pay Now (UPI Only)"}
                        </Button>

                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mt-6 flex gap-3 text-left">
                            <Lock className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-800 leading-snug">
                                Payment is secured by Paytm. We strictly accept UPI payments to ensure fast & verified transactions.
                            </p>
                        </div>
                    </div>

                    <Button variant="ghost" className="w-full" onClick={() => setCurrentStep(2)}>Back to Review</Button>
                </div>
            )}

            <div className="h-24"></div>
        </RoyalFormLayout>
    );
}

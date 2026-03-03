'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, HackathonTeam } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Ticket, PartyPopper, Calendar, Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CustodialWallet } from '@/components/CustodialWallet';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

export function RoyalDashboard() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [loading, setLoading] = React.useState(true);
    const [hackathonTeam, setHackathonTeam] = React.useState<HackathonTeam | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                // CONSOLIDATED: Use userProfile directly (no 'registrations' read)
                // userProfile already contains hasEntryPass and other fields

                // 2. Fetch Hackathon Team (by Leader Email - fallback)
                // Ideally we should link by userId in the future
                if (user.email) {
                    const q = query(
                        collection(db, 'hackathon_teams'),
                        where('leader.email', '==', user.email)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setHackathonTeam({ id: snap.docs[0].id, ...snap.docs[0].data() } as HackathonTeam);
                    }
                }
            } catch (error) {
                console.error("Dashboard Fetch Error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleHackathonPayment = async () => {
        if (!hackathonTeam || !user) return;

        try {
            setLoading(true);
            const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
            const orderId = `HACK_${Date.now()}_${uniqueSuffix}`; // ~23 chars
            // Assuming Hackathon Fee is fixed, e.g., 500. 
            // TODO: Move to config
            const amount = "500";

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
                    eventIds: ['HACKATHON'] // Special Event ID
                })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            // Submit to Paytm
            const form = document.createElement('form');
            form.method = 'POST';
            const baseUrl = process.env.NODE_ENV === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
            form.action = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${data.orderId}`;

            const addField = (name: string, value: string) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
                form.appendChild(input);
            };

            addField('mid', data.mid);
            addField('orderId', data.orderId);
            addField('txnToken', data.txnToken);

            document.body.appendChild(form);
            form.submit();

        } catch (error: any) {
            toast.error(error.message || "Payment init failed");
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;

    const isHackathonSelected = hackathonTeam?.status === 'approved';
    const isHackathonPaid = hackathonTeam?.paymentStatus === 'success';

    return (
        <div className="min-h-screen bg-neutral-900 text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                        <span className={cn("font-bold text-black text-xl", cinzel.className)}>A</span>
                    </div>
                    <span className={cn("font-bold text-xl tracking-wider text-yellow-500", cinzel.className)}>Kingdom</span>
                </div>
                <div
                    onClick={() => router.push('/profile')}
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 border-2 border-yellow-200 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                />
            </header>

            <main className="container max-w-lg mx-auto px-4 mt-8 space-y-8">

                {/* 1. Identity / Pass Placeholder */}
                <div className="relative group perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-neutral-800 to-neutral-900 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden min-h-[220px] flex flex-col justify-between">
                        {/* Content */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-yellow-500 text-xs font-bold uppercase tracking-[0.2em] mb-1">Citizen Pass</h3>
                                <h1 className={cn("text-2xl font-bold text-white", cinzel.className)}>{userProfile?.fullName}</h1>
                                <p className="text-neutral-400 text-xs font-mono mt-1">{userProfile?.registrationNumber || "REG-XXXX"}</p>
                            </div>
                            <Shield className="w-8 h-8 text-yellow-500/50" />
                        </div>

                        {/* QR Placeholder (Waiting for Canva) */}
                        <div className="flex items-end justify-between mt-6">
                            <div className="space-y-1">
                                <div className="text-[10px] text-neutral-500 uppercase font-bold">Status</div>
                                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                    userProfile?.hasEntryPass ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-red-500/10 text-red-400 border-red-500/30")}>
                                    {userProfile?.hasEntryPass ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {userProfile?.hasEntryPass ? "Citizenship Granted" : "Payment Pending"}
                                </div>
                            </div>

                            {/* Visual QR Stub */}
                            <div className="w-16 h-16 bg-white p-1 rounded-lg opacity-80">
                                <div className="w-full h-full border-2 border-black border-dashed flex items-center justify-center text-[8px] text-black font-bold text-center leading-tight">
                                    PASS<br />QR
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Action Center (Hackathon Payment) */}
                {isHackathonSelected && !isHackathonPaid && (
                    <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><Trophy className="w-24 h-24 text-purple-400" /></div>
                        <h3 className={cn("text-xl font-bold text-white mb-2", cinzel.className)}>Hackathon Shortlisted!</h3>
                        <p className="text-sm text-purple-200 mb-6 max-w-[80%]">
                            Congratulations! Your team <b>{hackathonTeam?.teamName}</b> has been selected for the Grand Finale. Secure your spot now.
                        </p>
                        <Button
                            onClick={handleHackathonPayment}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold w-full shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400"
                        >
                            Confirm Seat ( ₹500 )
                        </Button>
                    </div>
                )}

                {/* 3. Wallet */}
                <div className="pt-2">
                    <CustodialWallet />
                </div>

                {/* 4. Quick Nav */}
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-auto py-4 bg-neutral-800/50 border-white/10 hover:bg-neutral-800 hover:border-yellow-500/50 flex flex-col items-center gap-2 group" onClick={() => router.push('/schedule')}>
                        <Calendar className="w-6 h-6 text-neutral-400 group-hover:text-yellow-500 transition-colors" />
                        <span className="text-xs font-bold tracking-widest uppercase text-neutral-300">Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 bg-neutral-800/50 border-white/10 hover:bg-neutral-800 hover:border-yellow-500/50 flex flex-col items-center gap-2 group" onClick={() => router.push('/clubs')}>
                        <PartyPopper className="w-6 h-6 text-neutral-400 group-hover:text-yellow-500 transition-colors" />
                        <span className="text-xs font-bold tracking-widest uppercase text-neutral-300">Events</span>
                    </Button>
                </div>

            </main>
        </div>
    );
}

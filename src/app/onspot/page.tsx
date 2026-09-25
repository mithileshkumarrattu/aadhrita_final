'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wallet, Send, LogOut, ShieldCheck, Search, QrCode } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { auth } from '@/lib/firebase';
import { db, COLLECTIONS } from '@/lib/db';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export default function OnSpotDashboard() {
    const router = useRouter();
    const [loading, setLoading] = React.useState(true);
    const [actionLoading, setActionLoading] = React.useState(false);

    // Coordinator Info
    const [allowance, setAllowance] = React.useState('0.00');
    const [coordinatorAddress, setCoordinatorAddress] = React.useState<string | null>(null);
    const [convenerAddress, setConvenerAddress] = React.useState<string | null>(null);

    // Form State
    const [recipientAddress, setRecipientAddress] = React.useState('');
    const [amount, setAmount] = React.useState('');

    React.useEffect(() => {
        const init = async () => {
            const session = getStaffSession();
            if (!session || session.role !== 'onspot_coordinator') {
                router.replace('/faculty');
                return;
            }

            try {
                // 1. Find Convener Address (Shared Wallet master)
                const convenerSnap = await getDocs(query(
                    collection(db, COLLECTIONS.STAFF),
                    where('role', '==', 'convener'),
                    limit(1)
                ));

                if (convenerSnap.empty) {
                    toast.error("No active Convener found. Transfers disabled.");
                    setLoading(false);
                    return;
                }
                const cAddr = convenerSnap.docs[0].data().walletAddress;
                setConvenerAddress(cAddr);

                // 2. Fetch Coordinator's Allowance from this Convener
                const allowRes = await fetch(`/api/wallet/allowance?ownerId=${convenerSnap.docs[0].id}&spenderId=${session.id}`);
                const allowData = await allowRes.json();
                
                if (allowData.success) {
                    setAllowance(parseFloat(allowData.allowance).toFixed(2));
                    setCoordinatorAddress(allowData.spenderAddress);
                }

            } catch (error) {
                console.error("Dashboard Load Error:", error);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router]);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientAddress || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid address and amount");
            return;
        }

        setActionLoading(true);
        const tid = toast.loading(`Processing transfer of ${amount} AFT...`);

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/wallet/transferFrom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromAddress: convenerAddress,
                    toAddress: recipientAddress.trim(),
                    amount: Number(amount)
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`Sent ${amount} AFT to student!`, { id: tid });
                setRecipientAddress('');
                setAmount('');
                // Refresh allowance
                const newAllowance = (parseFloat(allowance) - Number(amount)).toFixed(2);
                setAllowance(newAllowance);
            } else {
                toast.error(data.error || "Transfer failed", { id: tid });
            }
        } catch (error) {
            console.error("Transfer error:", error);
            toast.error("Failed to execute transfer", { id: tid });
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/faculty');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <CoinLoader size={64} text="Initializing Payment Gateway..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 selection:bg-amber-500/30">
            {/* Background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[100px]" />
            </div>

            <main className="max-w-xl mx-auto space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <ShieldCheck className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">On-Spot Events</h1>
                            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">AFT Disbursement Portal</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>

                {/* Balance Card */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl shadow-2xl overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-zinc-500 uppercase tracking-[0.2em] font-semibold text-[10px]">Your Allocated Allowance</CardDescription>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 tracking-tighter">
                                {allowance}
                            </span>
                            <span className="text-xl font-bold text-amber-500/80">AFT</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="p-3 bg-black/40 rounded-lg border border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-zinc-500" />
                                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">
                                    {coordinatorAddress || '0x...'}
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded uppercase">Coordinator ID</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Transfer Form */}
                <Card className="bg-zinc-900/30 border-zinc-800/30 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Send className="w-4 h-4 text-amber-500" />
                            Send AFT Rewards
                        </CardTitle>
                        <CardDescription>Grant AFT instantly to on-spot participants.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleTransfer} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Student Wallet Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                                    </div>
                                    <Input
                                        placeholder="0x..."
                                        className="bg-black/50 border-zinc-800/50 pl-10 h-12 focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/50 text-amber-50 transition-all font-mono text-sm"
                                        value={recipientAddress}
                                        onChange={(e) => setRecipientAddress(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Amount to Reward</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="e.g. 10"
                                        className="bg-black/50 border-zinc-800/50 h-12 focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/50 text-amber-50 transition-all font-bold text-lg"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <span className="text-xs font-bold text-amber-500/50">AFT</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold h-12 shadow-lg shadow-amber-900/20 transition-all group"
                                >
                                    {actionLoading ? (
                                        <CoinLoader size={20} />
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            Confirm Transfer
                                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

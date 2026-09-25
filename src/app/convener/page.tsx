'use client';
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { db, COLLECTIONS, getEvents, Event } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Wallet, Users, ArrowRight, LogOut, CheckCircle } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';

// Types
interface CoordinatorData {
    id: string; // The staff document ID from staff_credentials
    username: string;
    eventId: string;
    walletAddress?: string;
    allowanceAFT: string;
    role: string;
}

export default function ConvenerDashboard() {
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    // Convener specific
    const [convenerWalletAddress, setConvenerWalletAddress] = React.useState<string | null>(null);
    const [convenerBalance, setConvenerBalance] = React.useState<string>('0');
    const [convenerId, setConvenerId] = React.useState<string | null>(null);

    // Coordinators & Events
    const [events, setEvents] = React.useState<{ [id: string]: Event }>({});
    const [coordinators, setCoordinators] = React.useState<CoordinatorData[]>([]);

    const [approvalAmounts, setApprovalAmounts] = React.useState<{ [id: string]: string }>({});

    // Authenticate and Load Data
    React.useEffect(() => {
        const init = async () => {
            const session = getStaffSession();
            if (!session || session.role !== 'convener') {
                toast.error("Access Restricted: Convener only");
                router.push('/faculty');
                return;
            }
            setConvenerId(session.id);

            try {
                // 1. Fetch Convener Wallet Balance
                const balRes = await fetch(`/api/wallet/balance?userId=${session.id}&collectionName=staff_credentials`);
                const balData = await balRes.json();
                if (balData.exists) {
                    setConvenerBalance(parseFloat(balData.balance).toFixed(2));
                    setConvenerWalletAddress(balData.address);
                }

                // 2. Fetch Events for title mapping
                const allEvents = await getEvents();
                const evMap: any = {};
                allEvents.forEach(e => { if (e.id) evMap[e.id] = e; });
                setEvents(evMap);

                // 3. Fetch Coordinators from staff_credentials where role = coordinator
                const coordSnap = await getDocs(query(collection(db, 'staff_credentials'), where('role', 'in', ['coordinator', 'onspot_coordinator', 'fyfp_coordinator'])));
                const coordList: CoordinatorData[] = [];

                for (const d of coordSnap.docs) {
                    const data = d.data();
                    const isSpecialRole = ['onspot_coordinator', 'fyfp_coordinator'].includes(data.role);
                    
                    if ((data.assignedEventId || isSpecialRole) && data.walletAddress) {
                        try {
                            const allowRes = await fetch(`/api/wallet/allowance?ownerId=${session.id}&spenderId=${d.id}`);
                            const allowData = await allowRes.json();
                            coordList.push({
                                id: d.id,
                                username: data.username,
                                eventId: data.assignedEventId,
                                walletAddress: data.walletAddress,
                                allowanceAFT: allowData.success ? parseFloat(allowData.allowance).toFixed(2) : '0.00',
                                role: data.role
                            });
                        } catch (e) {
                            console.error("Allowance fetch err for", d.id);
                            coordList.push({ ...data, id: d.id, allowanceAFT: '0.00' } as any);
                        }
                    }
                }
                setCoordinators(coordList);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    const handleApprove = async (coordinatorId: string, spenderAddress: string) => {
        const amount = approvalAmounts[coordinatorId];
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (!confirm(`Are you sure you want to approve ${amount} AFT allowance for this coordinator?`)) return;

        setActionLoading(coordinatorId);
        const toastId = toast.loading(`Approving ${amount} AFT allowance...`);

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/wallet/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    spenderAddress,
                    amount: Number(amount)
                })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(`Allowance Approved!`, { id: toastId });
                // Refresh specific allowance locally
                setCoordinators(prev => prev.map(c =>
                    c.id === coordinatorId
                        ? { ...c, allowanceAFT: Number(amount).toFixed(2) } // Actually it overwrites old allowance standard ERC20
                        : c
                ));
                setApprovalAmounts(prev => ({ ...prev, [coordinatorId]: '' }));
            } else {
                toast.error(`Failed: ${data.error}`, { id: toastId });
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Approval failed", { id: toastId });
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/faculty');
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><CoinLoader size={64} text="Loading Master View..." /></div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
            {/* Header */}
            <header className="border-b border-indigo-500/20 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-lg leading-none truncate md:max-w-md">Convener Control Panel</h1>
                            <p className="text-xs text-indigo-400 font-mono mt-0.5">BUDGET DELEGATION (ERC20)</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-white hover:bg-red-500/20">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Master Wallet */}
                <Card className="bg-zinc-900 border-zinc-800 p-8 flex flex-col justify-center relative overflow-hidden ring-1 ring-white/10 shadow-2xl">
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div>
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2 block">Master Treasury Wallet (AFT)</span>
                            <div className="flex items-center gap-3">
                                <Wallet className="w-8 h-8 text-amber-500" />
                                <span className="text-6xl font-black text-white tracking-tighter">
                                    {convenerBalance}
                                </span>
                            </div>
                        </div>

                        {convenerWalletAddress && (
                            <div className="inline-flex max-w-min items-center bg-black/50 rounded-lg p-2 border border-zinc-800">
                                <span className="text-xs font-mono text-zinc-400 pr-2">
                                    {convenerWalletAddress}
                                </span>
                            </div>
                        )}
                        <p className="text-sm text-zinc-400 max-w-2xl mt-4">
                            You control the central supply for the fest. Use the list below to grant an "Allowance" to event coordinators. They can then disburse exactly that amount to students on your behalf securely without controlling the master wallet directly.
                        </p>
                    </div>
                </Card>

                {/* Coordinators Grid */}
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" /> Event Coordinators & Allowances
                    </h2>

                    {coordinators.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-500">
                            No active coordinators found with wallets. Please ensure wallet generation has run.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {coordinators.map(coord => {
                                const event = coord.eventId ? events[coord.eventId] : undefined;
                                return (
                                    <Card key={coord.id} className="bg-zinc-900 border-white/5 p-6 hover:border-white/10 transition-colors flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-white line-clamp-1">
                                                    {coord.role === 'onspot_coordinator' ? 'ON-SPOT EVENTS' :
                                                        coord.role === 'fyfp_coordinator' ? 'FYFP EVENT' :
                                                            (event?.title || coord.eventId || 'Staff Account')}
                                                </h3>
                                                <p className="text-sm text-indigo-400">@{coord.username}</p>
                                            </div>
                                            <div className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded uppercase border border-green-500/20 whitespace-nowrap">
                                                Active
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div className="p-3 bg-black/40 rounded-lg border border-zinc-800">
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Current Delegated Allowance</div>
                                                <div className="text-2xl font-mono font-bold text-amber-500">
                                                    {coord.allowanceAFT} <span className="text-sm font-sans tracking-normal">AFT</span>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Set New Allowance</div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 500"
                                                        className="bg-black/50 border-zinc-700 focus:border-indigo-500 text-white font-mono"
                                                        value={approvalAmounts[coord.id] || ''}
                                                        onChange={(e) => setApprovalAmounts(prev => ({ ...prev, [coord.id]: e.target.value }))}
                                                    />
                                                    <Button
                                                        onClick={() => handleApprove(coord.id, coord.walletAddress!)}
                                                        disabled={actionLoading === coord.id || !coord.walletAddress}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[100px]"
                                                    >
                                                        {actionLoading === coord.id ? <CoinLoader size={16} /> : <span>Approve <ArrowRight className="w-3 h-3 ml-1 inline" /></span>}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-zinc-600 mt-2 leading-tight">
                                                    Note: Approving a new allowance *overwrites* the existing allowance for this coordinator instantly on the blockchain.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

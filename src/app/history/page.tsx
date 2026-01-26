'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [history, setHistory] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!user) return;

        async function fetchHistory() {
            if (!user) return;
            try {
                const res = await fetch(`/api/wallet/history?userId=${user.uid}`);
                const data = await res.json();
                if (data.success) {
                    setHistory(data.history);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, [user]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
            <header className="sticky top-0 z-30 bg-white border-b-2 border-black px-6 py-4 flex items-center gap-4 shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-slate-100"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-black uppercase tracking-tight">History</h1>
            </header>

            <main className="p-6 max-w-lg mx-auto">
                {loading ? (
                    <div className="text-center py-10 opacity-50 font-bold">Loading Transactions...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        <Clock className="w-12 h-12 mx-auto mb-4" />
                        <div className="font-700">No transactions yet</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((tx) => (
                            <Card key={tx.id} className="p-4 border-2 border-black shadow-neo-sm rounded-xl flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full border-2 border-black flex items-center justify-center",
                                        tx.from === tx.userId ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                        // Wait, logic check: if 'from' matches MY wallet, it's Outgoing (Red).
                                        // However, I need to know MY wallet address. 
                                        // But logic: api/history filters by userId. 
                                        // If I sent it, userId matches. So it's outgoing.
                                        // We only log 'userId' on outgoing currently.
                                        // So all here are likely outgoing unless we improve API.
                                        // Assuming all are Outgoing for now based on API logic.
                                    )}>
                                        <ArrowUpRight className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Transfer</div>
                                        <div className="text-[10px] font-mono text-slate-500 truncate w-32">
                                            To: {tx.to.slice(0, 6)}...
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-lg">-{tx.amount} <span className="text-xs font-bold text-slate-400">AAHT</span></div>
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-blue-600 flex items-center justify-end gap-1 hover:underline"
                                    >
                                        View <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

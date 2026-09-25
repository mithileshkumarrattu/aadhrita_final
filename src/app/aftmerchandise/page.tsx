'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Wallet, LogOut, Store, ArrowDownLeft, Clock, Copy, ExternalLink, QrCode } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { db, COLLECTIONS } from '@/lib/db';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import QRCode from 'react-qr-code';

interface Transaction {
    id: string;
    from: string;
    amount: number | string;
    timestamp: any;
    txHash: string;
}

export default function MerchandiseDashboard() {
    const router = useRouter();
    const [loading, setLoading] = React.useState(true);
    
    // Account Info
    const [balance, setBalance] = React.useState('0.00');
    const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);

    React.useEffect(() => {
        const session = getStaffSession();
        if (!session || session.role !== 'merchandise') {
            router.replace('/faculty');
            return;
        }

        let unsubTransactions: () => void;

        const init = async () => {
            try {
                // 1. Fetch Staff Wallet Address
                const staffDoc = await getDocs(query(
                    collection(db, COLLECTIONS.STAFF),
                    where('username', '==', session.username),
                    limit(1)
                ));

                if (staffDoc.empty) {
                    toast.error("Staff account not found.");
                    setLoading(false);
                    return;
                }
                const addr = staffDoc.docs[0].data().walletAddress;
                setWalletAddress(addr);

                if (addr) {
                    // 2. Fetch Balance
                    const balRes = await fetch(`/api/wallet/balance?address=${addr}`);
                    const balData = await balRes.json();
                    if (balData.success) {
                        setBalance(parseFloat(balData.balance).toFixed(2));
                    }

                    // 3. Setup Transaction Listener (Incoming transfers to this address)
                    const q = query(
                        collection(db, 'transactions'),
                        where('to', '==', addr),
                        orderBy('timestamp', 'desc'),
                        limit(20)
                    );

                    unsubTransactions = onSnapshot(q, (snapshot) => {
                        const txs: Transaction[] = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        } as Transaction));
                        setTransactions(txs);
                    }, (err) => {
                        console.error("Tx Listener Err:", err);
                    });
                }

            } catch (error) {
                console.error("Dashboard Load Error:", error);
                toast.error("Failed to load merchandise data");
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            if (unsubTransactions) unsubTransactions();
        };
    }, [router]);

    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            toast.success("Address copied to clipboard!");
        }
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/faculty');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <CoinLoader size={64} text="Connecting Merchandise Node..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-white p-4 md:p-8 selection:bg-indigo-500/30">
            {/* Background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            <main className="max-w-4xl mx-auto space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <Store className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-indigo-50">Merchandise Portal</h1>
                            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">AFT Payment Receiver</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Receiver Info */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* Balance Card */}
                        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl shadow-2xl overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                            <CardHeader className="pb-2">
                                <CardDescription className="text-zinc-500 uppercase tracking-[0.2em] font-semibold text-[10px]">Current Sales Balance</CardDescription>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-indigo-400 to-blue-500 tracking-tighter">
                                        {balance}
                                    </span>
                                    <span className="text-xl font-bold text-indigo-500/80">AFT</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-xs text-zinc-500 leading-relaxed italic">
                                        Ask customers to scan the QR code below and send AFT to this address. Verify the transfer in the history list.
                                    </p>
                                    <div className="p-4 bg-white rounded-xl shadow-inner flex items-center justify-center">
                                        {walletAddress ? (
                                            <QRCode 
                                                value={walletAddress} 
                                                size={180}
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                                level="H"
                                            />
                                        ) : (
                                            <div className="w-[180px] h-[180px] bg-zinc-100 animate-pulse rounded-lg" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="p-3 bg-black/40 rounded-lg border border-zinc-800/50 flex items-center justify-between group/addr">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Wallet className="w-3 h-3 text-zinc-500 shrink-0" />
                                                <span className="text-[10px] font-mono text-zinc-400 truncate">
                                                    {walletAddress || '0x...'}
                                                </span>
                                            </div>
                                            <button onClick={copyAddress} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-indigo-400">
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Transaction History */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-400" />
                                Recent Sales
                            </h2>
                            <span className="text-[10px] text-zinc-600 font-mono">Live Sync Active</span>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                            {transactions.length === 0 ? (
                                <div className="p-12 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
                                    <ArrowDownLeft className="w-8 h-8 text-zinc-700 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm text-zinc-600 italic">No incoming transactions yet.</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <Card key={tx.id} className="bg-zinc-900/30 border-zinc-800/50 hover:border-indigo-500/30 transition-all hover:bg-zinc-900/50 group">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                                        <ArrowDownLeft className="w-5 h-5 text-green-400" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                                                            From: <span className="text-zinc-300">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
                                                        </p>
                                                        <p className="text-[10px] text-zinc-600">
                                                            {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString() : 'Just now'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-lg font-black text-green-400 tracking-tight">
                                                        +{tx.amount} <span className="text-[10px] opacity-60">AFT</span>
                                                    </span>
                                                    <a 
                                                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] text-indigo-400 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Receipt <ExternalLink className="w-2 h-2" />
                                                    </a>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Help */}
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-3">
                    <div className="p-1.5 bg-indigo-500/10 rounded-md mt-0.5">
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">How to use this portal</p>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                            This account is designed only to **receive** AFT. Every time a student sends tokens to the QR above, the "Recent Sales" list will automatically update. You do not need to refresh the page.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

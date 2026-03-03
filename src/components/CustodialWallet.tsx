'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Copy, Check, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QRCode from "react-qr-code";

interface CustodialWalletProps {
    hidePayButton?: boolean;
    overrideUserId?: string;
}

export function CustodialWallet({ hidePayButton = false, overrideUserId }: CustodialWalletProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [balance, setBalance] = React.useState('0');
    const [address, setAddress] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [copied, setCopied] = React.useState(false);
    const [showQr, setShowQr] = React.useState(false);
    const [creationAttempted, setCreationAttempted] = React.useState(false);

    const fetchWallet = React.useCallback(async () => {
        const targetId = overrideUserId || user?.uid;
        if (!targetId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/wallet/balance?userId=${targetId}`);
            const data = await res.json();
            if (data.exists) {
                setAddress(data.address);
                setBalance(parseFloat(data.balance).toFixed(2));
            } else if (user && user.email && !creationAttempted) {
                setCreationAttempted(true);
                try {
                    await fetch('/api/wallet/create', {
                        method: 'POST',
                        body: JSON.stringify({ userId: targetId, email: user.email }),
                    });
                    const retryRes = await fetch(`/api/wallet/balance?userId=${targetId}`);
                    const retryData = await retryRes.json();
                    if (retryData.exists) {
                        setAddress(retryData.address);
                        setBalance(parseFloat(retryData.balance).toFixed(2));
                    }
                } catch (createErr) {
                    console.error("Auto-creation failed", createErr);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, overrideUserId, creationAttempted]);

    React.useEffect(() => {
        fetchWallet();
    }, [fetchWallet]);

    const handleCopy = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!user) return null;

    return (
        <Card className="p-5 bg-black border-2 border-zinc-800 shadow-neo rounded-2xl w-full relative overflow-hidden group">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center -ml-2">
                        <img src="/AFT.png" alt="AFT" className="w-full h-full object-contain drop-shadow-lg hover:animate-spin-3d" />
                    </div>
                    <div>
                        <span className="font-bold text-[10px] text-amber-500 uppercase tracking-[0.2em] block mb-0.5">Personal Wallet</span>
                        <span className="font-black text-lg text-white tracking-wide">Aadhrita Coin</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    onClick={fetchWallet}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="mb-6 relative z-10">
                <div className="text-5xl font-black text-white flex items-baseline gap-2 mb-6">
                    {balance} <span className="text-xl font-bold text-zinc-600">AFT</span>
                </div>

                <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Wallet Address</span>
                    <div className="flex items-stretch gap-2">
                        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group-hover:border-zinc-700 transition-colors">
                            {address ? (
                                <>
                                    <span className="font-mono font-bold text-zinc-300 text-xs sm:text-sm">{address.slice(0, 10)}...{address.slice(-6)}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopy}
                                        className="h-8 w-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 ml-2"
                                        title="Copy Address"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </>
                            ) : (
                                <span className="text-zinc-600 text-sm font-bold animate-pulse">Loading Identity...</span>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => setShowQr(!showQr)}
                            className={`h-auto aspect-square border-2 ${showQr ? 'bg-amber-500 border-amber-500 text-black' : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'} rounded-xl shadow-sm flex flex-col items-center justify-center p-0 w-[52px] transition-all`}
                            title="Show QR Code"
                        >
                            <QrCode className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {showQr && address && (
                    <div className="mt-4 bg-white rounded-2xl border-4 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)] p-6 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-300 relative">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Scan needed for Transfer</span>
                        <div className="p-1 bg-white">
                            <QRCode value={address} size={160} />
                        </div>
                        <p className="text-[10px] text-zinc-300 font-mono mt-4 text-center break-all opacity-50 px-8 hidden">{address}</p>
                    </div>
                )}
            </div>

            {!hidePayButton && (
                <div className="flex gap-2 relative z-10">
                    <Button
                        onClick={() => router.push('/pay')}
                        className="flex-1 bg-white text-black hover:bg-zinc-200 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] font-black text-xs uppercase tracking-wider rounded-xl h-11 transition-all"
                    >
                        Scan & Pay
                    </Button>
                </div>
            )}
        </Card>
    );
}

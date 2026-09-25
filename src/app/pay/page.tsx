'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Wallet, QrCode, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { Scanner } from '@yudiel/react-qr-scanner';
import { CustodialWallet } from '@/components/CustodialWallet';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { AAHT_SYMBOL } from '@/lib/aaht';

export default function PaymentPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [recipient, setRecipient] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [txStatus, setTxStatus] = React.useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [txHash, setTxHash] = React.useState('');
    const [errorMsg, setErrorMsg] = React.useState('');
    const [showScanner, setShowScanner] = React.useState(false);

    const [showSuccess, setShowSuccess] = React.useState(false);

    // Backend based payment
    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !amount || !recipient) return;

        setLoading(true);
        setTxStatus('processing');
        setErrorMsg('');

        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/wallet/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    toAddress: recipient.trim(),
                    amount: amount
                })
            });

            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Transfer failed');
                } else {
                    const text = await res.text();
                    console.error("Make sure endpoint exists and is returning JSON:", text);
                    throw new Error(`Server Error (${res.status}): Possible API Route Crash or 404. Check console.`);
                }
            }

            const data = await res.json();

            if (data.success) {
                setTxHash(data.txHash);
                setTxStatus('success');
                setAmount('');

                // Trigger Animation
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000); // Hide after 3s
            } else {
                throw new Error(data.message || 'Unknown error');
            }
        } catch (err: any) {
            console.error(err);
            setTxStatus('error');
            setErrorMsg(err.message || 'Transaction failed. Check balance or try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = (text: string) => {
        if (text) {
            setRecipient(text);
            setShowScanner(false);
        }
    }

    return (
        <div className="min-h-screen bg-black pb-28 font-sans text-zinc-100 overflow-hidden relative">
            {/* Background Texture */}
            <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <img src="/s2.webp" alt="Background" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
            </div>

            {/* Success Animation Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative animate-[slide-up_0.5s_ease-out_forwards] perspective-1000">
                        <img
                            src="/AFT.png"
                            alt="Success Token"
                            className="w-48 h-48 md:w-64 md:h-64 animate-spin-3d drop-shadow-[0_0_60px_rgba(250,204,21,0.6)]"
                        />
                    </div>
                    <h2 className="mt-8 text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-tighter filter drop-shadow-lg italic transform -skew-x-12">
                        TRANSFERRED!
                    </h2>
                    <p className="text-white/60 font-mono mt-4 text-sm break-all max-w-xs text-center border border-white/20 p-2 rounded-lg bg-white/5">
                        Tx: {txHash.slice(0, 8)}...{txHash.slice(-8)}
                    </p>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center gap-4 shadow-lg">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-black uppercase tracking-tight text-white">Scanner & Pay</h1>
            </header>

            <main className="relative z-10 p-6 pt-24 max-w-lg mx-auto space-y-6">

                {/* Wallet Balance Card */}
                <CustodialWallet hidePayButton />

                {/* Status Cards - Only Error (Success handled by animation) */}
                {txStatus === 'error' && (
                    <Alert variant="destructive" className="bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl backdrop-blur-md">
                        <AlertTitle className="font-bold">Transfer Failed</AlertTitle>
                        <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                )}

                <Card className="border border-yellow-600/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] rounded-[2rem] overflow-hidden bg-zinc-900/80 backdrop-blur-md">
                    <form onSubmit={handleTransfer}>
                        <CardHeader className="bg-black/40 border-b border-white/10 p-6">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                    <Send className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase text-white">Send {AAHT_SYMBOL}</h2>
                                    <p className="text-xs font-bold text-zinc-500">Instant Fest Payment</p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-8">

                            {/* Recipient Input with Highlighted Scan Button */}
                            <div className="space-y-3">
                                <Label htmlFor="recipient" className="font-bold text-sm ml-1 text-zinc-400">Recipient Address</Label>
                                <div className="relative">
                                    <Input
                                        id="recipient"
                                        placeholder="0x..."
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        className="h-16 pl-6 pr-16 rounded-2xl bg-black border-zinc-800 text-white font-mono text-sm shadow-inner focus-visible:ring-yellow-500/50 transition-all placeholder:text-zinc-700"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        className="absolute right-2 top-2 h-12 w-12 rounded-xl bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all hover:scale-105"
                                        onClick={() => setShowScanner(true)}
                                        title="Scan QR Code"
                                    >
                                        <QrCode className="w-6 h-6" />
                                    </Button>
                                </div>
                            </div>

                            {showScanner && (
                                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                                    <div className="w-full max-w-sm bg-zinc-900 rounded-2xl overflow-hidden relative border border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                                        <Button
                                            variant="ghost"
                                            className="absolute top-2 right-2 z-10 text-white bg-black/50 hover:bg-black/70 rounded-full h-8 w-8 p-0"
                                            onClick={() => setShowScanner(false)}
                                        >
                                            &times;
                                        </Button>
                                        <div className='aspect-square overflow-hidden'>
                                            <Scanner
                                                onScan={(result) => {
                                                    if (result && result.length > 0) {
                                                        handleScan(result[0].rawValue);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="p-4 bg-black text-white text-center">
                                            <p className="font-bold text-sm text-yellow-500 uppercase tracking-widest">Scanning...</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label htmlFor="amount" className="font-bold text-sm ml-1 text-zinc-400">Amount ({AAHT_SYMBOL})</Label>
                                <div className="relative">
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="h-16 pl-6 text-3xl font-black rounded-2xl bg-black border-zinc-800 text-white shadow-inner focus-visible:ring-yellow-500/50 transition-all placeholder:text-zinc-800"
                                        required
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-600 pointer-events-none">{AAHT_SYMBOL}</div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="p-6 pt-0">
                            <Button
                                type="submit"
                                className="w-full h-16 text-lg font-black bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 border-none shadow-[0_0_20px_rgba(234,179,8,0.4)] rounded-2xl active:scale-[0.98] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <CoinLoader size={20} className="mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    'Send Now'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" /> Secured by Aadhrita Vault
                </p>
            </main>
        </div>
    );
}

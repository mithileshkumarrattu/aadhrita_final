'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ArrowLeft, Wallet, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Cinzel } from 'next/font/google';
import { CoinLoader } from '@/components/ui/CoinLoader';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function TestPaymentPage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = React.useState(false);

    // Default values from profile if available
    const [formData, setFormData] = React.useState({
        amount: '1',
        email: '',
        phone: '',
        studentName: '',
        regNo: ''
    });

    React.useEffect(() => {
        if (user && userProfile) {
            setFormData(prev => ({
                ...prev,
                email: user.email || '',
                phone: userProfile.mobileNumber || '',
                studentName: userProfile.fullName || '',
                regNo: userProfile.registrationNumber || ''
            }));
        }
    }, [user, userProfile]);

    const handleInitiate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("Please login first");
            return;
        }

        if (Number(formData.amount) <= 0) {
            toast.error("Invalid Amount");
            return;
        }

        setLoading(true);
        try {
            // Short Order ID (< 26 chars) as requested by Paytm
            // Format: T_ + 8 random alphanum chars (sufficient collision resistance for tests)
            // e.g., T_ky3d8f9s (10 chars total)

            // Simple random generator since we don't have nanoid installed/imported here easily
            const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
            const orderId = `T_${randomSuffix}`;

            // Use the Standard API with Prod Env
            const res = await fetch('/api/paytm/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: formData.amount,
                    email: formData.email,
                    phone: formData.phone,
                    studentName: formData.studentName,
                    orderId,
                    userId: user.uid,
                    eventIds: ['TEST_EVENT'] // Mock event ID
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Init Failed");

            if (data.deepLink) {
                window.location.href = data.deepLink;
                return;
            }

            if (data.txnToken) {
                const baseUrl = process.env.NODE_ENV === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
                const paytmUrl = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${orderId}&txnToken=${data.txnToken}`;
                window.location.href = paytmUrl;
            } else {
                throw new Error("No TxnToken received");
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Payment Failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-amber-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative w-full max-w-md">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="mb-8 text-neutral-400 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>

                <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-amber-500 to-red-600" />
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                            <Wallet className="w-6 h-6 text-amber-500" />
                        </div>
                        <h1 className={cinzel.className + " text-2xl font-bold text-white mb-1"}>Test Payment Gateway</h1>
                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 py-1 px-3 rounded-full w-fit mx-auto border border-green-900/30">
                            <ShieldCheck className="w-3 h-3" />
                            SECURE STAGING MODE
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleInitiate} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-xs uppercase font-bold">Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">₹</span>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        className="pl-8 bg-black/40 border-white/10 text-white font-mono text-lg h-12 focus:border-amber-500/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-400 text-xs uppercase font-bold">User</Label>
                                    <Input
                                        value={formData.studentName}
                                        disabled
                                        className="bg-zinc-800/50 border-white/5 text-neutral-400 text-sm h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-400 text-xs uppercase font-bold">Reg No</Label>
                                    <Input
                                        value={formData.regNo}
                                        disabled
                                        className="bg-zinc-800/50 border-white/5 text-neutral-400 text-sm h-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-xs uppercase font-bold">Email (For Receipt)</Label>
                                <Input
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white text-sm h-10 focus:border-amber-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-xs uppercase font-bold">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white text-sm h-10 focus:border-amber-500/50"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-900/20 mt-4"
                            >
                                {loading ? <CoinLoader size={20} /> : <CreditCard className="w-5 h-5 mr-2" />}
                                {loading ? 'Initializing...' : `Pay ₹${formData.amount}`}
                            </Button>

                            <p className="text-[10px] text-center text-neutral-500 mt-4 max-w-xs mx-auto">
                                This transaction will be processed in a Sandbox Environment. No real money will be deducted.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

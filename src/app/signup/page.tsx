'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function SignupPage() {
    const router = useRouter();
    const { register, googleLogin, user } = useAuth();
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [isSafeBrowser, setIsSafeBrowser] = React.useState(true);

    React.useEffect(() => {
        const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor) : '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const inAppBrowsers = ['Instagram', 'FBAN', 'FBAV', 'WhatsApp', 'LinkedIn', 'Snapchat', 'Line'];
        const isEmbedded = inAppBrowsers.some(rule => ua.includes(rule));
        setIsSafeBrowser(!(isIOS || isEmbedded));
    }, []);

    React.useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const data = new FormData(event.currentTarget);
        const fullName = (data.get('fullName') as string || '').trim();
        const regNo = (data.get('regNo') as string || '').trim();
        const password = (data.get('password') as string || '').trim();
        const role = 'student';

        if (!fullName || !regNo || !password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            await register(regNo, password, fullName, role);
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this Registration Number already exists.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 relative overflow-hidden font-sans text-slate-900">
            {/* Abstract Background Shapes */}
            <div className="absolute top-[10%] right-[-10%] w-80 h-80 bg-cyan-300 rounded-full blur-3xl opacity-40 animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-pink-300 rounded-full blur-3xl opacity-40 animate-pulse delay-1000" />

            <div className="mb-8 flex flex-col items-center relative z-10">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-neo border-2 border-black rotate-3">
                    <UserPlus className="text-white w-8 h-8" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">
                    Join MVGR
                </h1>
                <p className="text-sm font-medium text-slate-500 text-center max-w-[250px]">
                    Create your student account to get started
                </p>
            </div>

            <Card className="w-full max-w-sm border-2 border-black shadow-neo-lg rounded-[2rem] overflow-hidden bg-white relative z-10">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="space-y-1 pb-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border-2 border-red-100 rounded-xl font-bold text-center">
                                {error}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                id="fullName"
                                name="fullName"
                                placeholder="Full Name"
                                required
                                className="rounded-xl bg-slate-50 border-2 border-black h-12 font-bold shadow-neo-sm focus-visible:ring-0 focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all placeholder:font-normal"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                id="regNo"
                                name="regNo"
                                placeholder="Registration Number"
                                required
                                className="rounded-xl bg-slate-50 border-2 border-black h-12 font-bold shadow-neo-sm focus-visible:ring-0 focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all placeholder:font-normal uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Password"
                                required
                                className="rounded-xl bg-slate-50 border-2 border-black h-12 font-bold shadow-neo-sm focus-visible:ring-0 focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all placeholder:font-normal"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Button
                            type="submit"
                            className="w-full rounded-xl h-12 text-base font-bold border-2 border-black shadow-neo active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-black text-white hover:bg-slate-900"
                            disabled={loading}
                        >
                            {loading ? 'Registering...' : 'Create Account'}
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-300" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-500 font-bold">Or join with</span>
                            </div>
                        </div>

                        {isSafeBrowser ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl h-12 text-sm font-bold border-2 border-slate-200 hover:border-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                onClick={() => googleLogin()}
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </Button>
                        ) : (
                            <div className="p-3 text-xs text-yellow-800 bg-yellow-100 border-2 border-yellow-200 rounded-xl font-bold flex flex-col gap-1 text-center leading-relaxed">
                                <span>⚠️ Google Login blocked by this app.</span>
                                <span className="text-yellow-700/80">Please register with credentials above, or open site in native Chrome/Safari by tapping the top right 3-dots.</span>
                            </div>
                        )}

                        <div className="text-center">
                            <Button
                                type="button"
                                variant="link"
                                className="text-sm text-slate-500 hover:text-black transition-colors font-bold"
                                onClick={() => router.push('/login')}
                            >
                                Already a member? <span className="underline decoration-2 decoration-wavy decoration-cyan-400 ml-1">Sign In</span>
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>

            <Button
                variant="ghost"
                size="sm"
                className="mt-8 text-slate-400 hover:text-slate-600 font-bold"
                onClick={() => router.push('/')}
            >
                Back to Home
            </Button>
        </div>
    );
}

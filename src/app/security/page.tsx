'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginStaff, setStaffSession } from '@/lib/staff-auth';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { CoinLoader } from '@/components/ui/CoinLoader';

export default function SecurityLoginPage() {
    const router = useRouter();
    const { user, userProfile, loading: authLoading, profileLoading, googleLogin } = useAuth();

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await loginStaff(username, password);

        if (result.success && result.session) {
            if (result.session.role !== 'security') {
                toast.error("Access Denied: Not a security account");
                setLoading(false);
                return;
            }
            setStaffSession(result.session);
            toast.success("Security Access Granted");
            router.push('/security/scanner');
        } else {
            toast.error(result.error || "Login Failed");
            setLoading(false);
        }
    };

    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
                <CoinLoader size={48} text="Authenticating..." />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black animate-pulse" />
                <Card className="w-full max-w-md bg-zinc-900/80 border-green-500/20 backdrop-blur-md relative z-10 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg border border-green-400/20">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black text-white tracking-widest uppercase">
                                Authentication Required
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                You must be securely logged in to your global account before accessing the Security Portal.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-white hover:bg-zinc-200 text-black font-bold h-11 uppercase tracking-widest transition-all"
                            onClick={() => googleLogin('/security')}
                        >
                            Sign In with Google
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black animate-pulse" />
            <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />

            <Card className="w-full max-w-md bg-zinc-900/80 border-green-500/20 backdrop-blur-md relative z-10 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg border border-green-400/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black text-white tracking-widest uppercase">
                            Security Portal
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Authorized Access Only
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-green-500 uppercase tracking-wider">Officer ID</label>
                            <Input
                                placeholder="Enter Username"
                                className="bg-black/50 border-zinc-700 focus:border-green-500 text-white font-mono"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-green-500 uppercase tracking-wider">Passcode</label>
                            <Input
                                type="password"
                                placeholder="•••••••"
                                className="bg-black/50 border-zinc-700 focus:border-green-500 text-white font-mono"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-12 uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? <Fingerprint className="animate-pulse w-5 h-5" /> : 'Authenticate System'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="absolute bottom-6 text-center w-full text-[10px] text-zinc-600 font-mono">
                SECURE CONSOLE V2.0 • FOR OFFICIAL USE ONLY
            </div>
        </div>
    );
}

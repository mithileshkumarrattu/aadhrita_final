'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lock, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginStaff, setStaffSession } from '@/lib/staff-auth';
import { toast } from 'sonner';

export default function FacultyLoginPage() {
    const router = useRouter();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await loginStaff(username, password);

        if (result.success && result.session) {
            if (result.session.role === 'hackathon_coordinator') {
                setStaffSession(result.session);
                toast.success("Welcome, Hackathon Coordinator");
                router.push('/hackathon-dashboard');
                return;
            }
            if (result.session.role === 'entrypass_viewer') {
                setStaffSession(result.session);
                toast.success("Welcome, Entry Pass Viewer");
                router.push('/dashboard/entrypass');
                return;
            }
            if (result.session.role === 'registrations_viewer') {
                setStaffSession(result.session);
                toast.success("Welcome, Master Registrations Viewer");
                router.push('/faculty/registrations');
                return;
            }
            if (result.session.role !== 'coordinator') {
                toast.error("Access Denied: Not a faculty account");
                setLoading(false);
                return;
            }
            setStaffSession(result.session);
            toast.success("Welcome, Faculty Coordinator");
            router.push('/faculty/dashboard');
        } else {
            toast.error(result.error || "Login Failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-black to-blue-900/20" />

            <Card className="w-full max-w-md bg-zinc-900/90 border-purple-500/20 backdrop-blur-md relative z-10 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-white tracking-tight">
                            Faculty Portal
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Event Coordinator Access
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Faculty ID</label>
                            <Input
                                placeholder="Enter Username"
                                className="bg-black/50 border-zinc-700 focus:border-purple-500 text-white"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Password</label>
                            <Input
                                type="password"
                                placeholder="•••••••"
                                className="bg-black/50 border-zinc-700 focus:border-purple-500 text-white"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 transition-all"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? <Lock className="animate-pulse w-4 h-4" /> : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

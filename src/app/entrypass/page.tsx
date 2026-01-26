'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle2, ArrowRight, ShieldCheck, ShoppingBag, Music } from 'lucide-react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function EntryPassPage() {
    const { user, googleLogin, loading } = useAuth();
    const router = useRouter();

    const handleAction = async () => {
        if (user) {
            router.push('/register/onboarding');
        } else {
            try {
                await googleLogin('/register/onboarding');
            } catch (error) {
                console.error("Login Failed", error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">

            {/* Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[url('/assets/tickets/entry-pass-bg.png')] bg-cover bg-center opacity-30 blur-sm scale-110" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-[#050505]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                    <Image src="/assets/logo-red-crown.png" alt="Logo" width={40} height={40} className="object-contain" />
                    <span className={cn("text-xl font-bold uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-red-600", cinzel.className)}>Aadhrita</span>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-12 max-w-6xl mx-auto px-4 py-8">

                {/* Visual Side */}
                <div className="flex-1 flex justify-center animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="relative w-[300px] h-[450px] md:w-[380px] md:h-[550px] bg-gradient-to-br from-red-900 to-black rounded-[2rem] border border-amber-500/30 shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden flex flex-col group hover:scale-105 transition-transform duration-500">
                        {/* Image */}
                        <div className="h-2/3 relative">
                            <Image
                                src="/assets/tickets/entry-pass-bg.png" // Fallback if specific image not needed
                                alt="Entry Pass"
                                fill
                                className="object-cover mix-blend-overlay opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                            <div className="absolute bottom-4 left-6">
                                <h3 className={cn("text-3xl font-bold uppercase text-white drop-shadow-md", cinzel.className)}>Festival Pass</h3>
                                <p className="text-amber-400 font-bold tracking-widest text-sm">26-27 FEB 2026</p>
                            </div>
                        </div>
                        {/* Details */}
                        <div className="flex-1 bg-black/40 backdrop-blur-md p-6 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <span>Verified Entry Access</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <ShoppingBag className="w-5 h-5 text-amber-500" />
                                    <span>Welcome Kit Included</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <Music className="w-5 h-5 text-blue-500" />
                                    <span>Access to Cultural Nights</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <div className="text-xs text-gray-400 uppercase tracking-widest">Base Price</div>
                                <div className="text-2xl font-bold text-white">₹200 <span className="text-xs font-normal text-gray-500">/ ₹300</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info & Action Side */}
                <div className="flex-1 space-y-8 text-center md:text-left animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
                    <div>
                        <h1 className={cn("text-5xl md:text-6xl font-black uppercase tracking-tight text-white mb-4", cinzel.className)}>
                            Unlock The <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">Experience</span>
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
                            Secure your place in the Kingdom of Aadhrita. This pass grants you entry to the festival grounds, pro-shows, and includes your exclusive participant kit.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 max-w-md mx-auto md:mx-0">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-start text-left">
                            <div className="bg-red-500/20 p-2 rounded-lg">
                                <UserCircle2 className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm uppercase">Login Required</h4>
                                <p className="text-xs text-gray-400 mt-1">
                                    We use your Google Account to verify your identity and generate your unique digital ID card.
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleAction}
                            className="h-16 text-xl font-bold bg-white text-black hover:bg-gray-200 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] flex items-center justify-center gap-3 mt-4"
                        >
                            {user ? (
                                <>
                                    Proceed to Registration <ArrowRight className="w-6 h-6" />
                                </>
                            ) : (
                                <>
                                    <Image src="/assets/google-logo.png" alt="G" width={24} height={24} />
                                    Login with Google to Continue
                                </>
                            )}
                        </Button>
                        {!user && (
                            <p className="text-xs text-gray-500">
                                By continuing, you agree to share your name and email.
                            </p>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}

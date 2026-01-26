'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Coins, Gift, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function AFTPage() {
    return (
        <div className="min-h-screen bg-black pb-28 font-sans text-neutral-100 overflow-x-hidden">

            {/* Hero Section */}
            <div className="relative w-full h-[60vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="/pile of aft.png" alt="AFT Gold" className="w-full h-full object-cover opacity-40 scale-105 animate-pulse-slow" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
                </div>

                <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-tr from-yellow-400 to-yellow-600 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.5)] flex items-center justify-center p-1">
                        <img src="/AFT.png" className="w-full h-full object-contain animate-spin-3d" />
                    </div>
                    <h1 className={cn("text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-xl", cinzel.className)}>
                        AFT COIN
                    </h1>
                    <p className="text-lg md:text-xl text-yellow-100/80 font-light tracking-wide max-w-lg mx-auto">
                        The Official Currency of the Kingdom
                    </p>
                </div>
            </div>

            {/* Content Container */}
            <div className="container max-w-2xl mx-auto px-6 -mt-20 relative z-20 space-y-12">

                {/* 1. What is AFT? */}
                <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                        <Coins className="text-yellow-500 w-6 h-6" /> What is AFT?
                    </h2>
                    <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                        **Aadhrita Fest Token (AFT)** is the digital soul of our festival. Earn it by participating, winning, and engaging. Spend it on exclusive perks, food stalls, and merchandise. It's not just points; it's power.
                    </p>
                </div>

                {/* 2. How to Earn */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-700" />
                        <span className="text-yellow-500 font-black uppercase tracking-widest text-sm">How to Earn</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-700" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-500/50 transition-colors">
                            <Sparkles className="w-8 h-8 text-yellow-400" />
                            <h3 className="font-bold text-white">Event Wins</h3>
                            <p className="text-xs text-zinc-500">Top podium finishes grant massive AFT bounties.</p>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-500/50 transition-colors">
                            <Share2 className="w-8 h-8 text-blue-400" />
                            <h3 className="font-bold text-white">Referrals</h3>
                            <p className="text-xs text-zinc-500">Bring friends to the kingdom and earn commission.</p>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-500/50 transition-colors">
                            <Gift className="w-8 h-8 text-pink-400" />
                            <h3 className="font-bold text-white">Daily Claims</h3>
                            <p className="text-xs text-zinc-500">Visit the portal daily to claim free drops.</p>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-500/50 transition-colors">
                            <TrendingUp className="w-8 h-8 text-green-400" />
                            <h3 className="font-bold text-white">Scavenger Hunts</h3>
                            <p className="text-xs text-zinc-500">Find hidden QR codes across the campus.</p>
                        </Card>
                    </div>
                </div>

                {/* 3. Utility */}
                <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-3xl p-8 text-center shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                    <div className="relative z-10">
                        <h2 className={cn("text-3xl font-black text-white mb-2", cinzel.className)}>SPEND & REDEEM</h2>
                        <p className="text-yellow-100 text-sm mb-6">Use your AFT at food stalls and merchandise shops.</p>
                        <Button className="bg-black text-yellow-500 hover:bg-zinc-900 font-bold px-8 rounded-xl border border-yellow-500/50 shadow-lg hover:scale-105 transition-transform">
                            View Marketplace (Coming Soon)
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}

'use client';

import React from 'react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Coins } from 'lucide-react';
import Image from 'next/image';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function AFTSection() {
    return (
        <div className="w-full relative mb-16 rounded-[3rem] overflow-hidden border border-white/10 group">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a0524] via-[#2D0A31] to-black opacity-90" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />

            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center p-8 md:p-16">
                <div className="flex flex-col gap-6 text-left">
                    <span className="px-4 py-2 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 w-fit text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Coins className="w-4 h-4" /> Powering Technology
                    </span>
                    <h2 className={cn("text-5xl md:text-7xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#f7e8b5] to-[#B8860B]", cinzel.className)}>
                        Earn AFT<br />Get Rewards
                    </h2>
                    <p className="text-neutral-300 text-lg leading-relaxed max-w-lg">
                        Aadhrita Fest Tokens (AFT) are your gateway to exclusives. Participate in events to earn coins and spend them on exclusive Merchandise gifts!
                    </p>

                    <div className="flex flex-col gap-4 mt-4">
                        <div className="flex items-center gap-4 text-sm font-bold text-white/80">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">🏆</div>
                            <span>Win Events &rarr; Earn AFT</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-bold text-white/80">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">🎁</div>
                            <span>Spend AFT &rarr; Get Swag</span>
                        </div>
                    </div>
                </div>

                {/* Coin Visuals */}
                <div className="relative h-[300px] md:h-[500px] w-full flex items-center justify-center">
                    {/* Glow Behind */}
                    <div className="absolute inset-0 bg-[#D4AF37] blur-[100px] opacity-20 rounded-full" />
                    <Image
                        src="/pile of aft.png" // User asset
                        alt="Pile of AFT Coins"
                        width={600}
                        height={600}
                        className="object-contain drop-shadow-2xl animate-in zoom-in duration-1000"
                    />
                </div>
            </div>
        </div>
    );
}

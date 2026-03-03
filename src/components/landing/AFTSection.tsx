'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function AFTSection() {
    const router = useRouter();
    return (
        <div className="w-full relative mb-16 rounded-[2rem] overflow-hidden group shadow-2xl border border-white/[0.05] bg-[#0a0604]">
            {/* Dark Metallic/Copper Gradient Background similar to reference */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,_#5c3d26_0%,_#0a0604_65%)] opacity-90 transition-opacity duration-1000 group-hover:opacity-100" />

            {/* Subtle Abstract Concentric Rings */}
            <div className="absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[900px] border border-white/[0.03] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[700px] border border-white/[0.04] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] border border-white/[0.05] rounded-full pointer-events-none" />

            {/* Stardust texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.15] mix-blend-screen pointer-events-none" />

            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center p-8 md:p-14 lg:p-20">
                <div className="flex flex-col gap-6 text-left">

                    {/* Headline */}
                    <div>
                        <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4.5rem] font-sans font-black text-white leading-[1.1] tracking-tight">
                            Earn AFT &<br />Get Rewards!
                        </h2>
                    </div>

                    {/* Realistic Description */}
                    <p className="text-neutral-300 text-sm md:text-base leading-relaxed max-w-sm font-mono tracking-wide opacity-90 mt-2">
                        Earn AFT by participating in and winning events, or grab them at on-spot challenges. Accumulate your wealth to claim premium merchandise and hidden rewards.
                    </p>

                </div>

                {/* Single Coin Visuals (Reference NFT style) */}
                <div className="relative h-[300px] md:h-[450px] w-full flex items-center justify-center group/image mt-8 md:mt-0">

                    {/* Core Glow behind the subject */}
                    <div className="absolute inset-0 bg-[#dca362] blur-[120px] opacity-20 rounded-full group-hover/image:opacity-30 transition-opacity duration-1000" />

                    <Image
                        src="/AFT.png"
                        alt="Aadhrita Fest Token"
                        fill
                        className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-in zoom-in duration-1000 md:group-hover/image:scale-[1.03] transition-transform duration-700 ease-out"
                    />

                </div>
            </div>
        </div>
    );
}

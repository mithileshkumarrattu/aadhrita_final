import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CoinLoaderProps {
    size?: number; // pixel size
    className?: string;
    text?: string;
}

export function CoinLoader({ size = 64, className, text }: CoinLoaderProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative perspective-1000">
                <Image
                    src="/AFT.png"
                    alt="Loading..."
                    width={size}
                    height={size}
                    className="animate-spin-3d drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
                    priority
                />
            </div>
            {text && (
                <p className="text-sm font-bold uppercase tracking-widest text-[#FACC15] animate-pulse drop-shadow-md">
                    {text}
                </p>
            )}
        </div>
    );
}

// Full screen overlay version
export function FullScreenCoinLoader({ text }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* Gold Glow Effect */}
            <div className="absolute w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <CoinLoader size={128} text={text} />
        </div>
    );
}

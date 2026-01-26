'use client';

import * as React from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export default function RegistrationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={cn("min-h-screen font-sans text-white overflow-x-hidden", inter.className)}>
            {/* Mood Indigo Style Background: Dark Purple/Violet with Abstract Blobs */}
            <div className="fixed inset-0 z-[-1] bg-[#1a0b2e]">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b4e] via-[#1a0b2e] to-[#0f0518] opacity-90" />

                {/* Abstract Shapes (Animated) */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
                <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

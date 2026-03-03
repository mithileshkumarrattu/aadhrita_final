'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

interface RoyalFormLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    showStep?: boolean;
    currentStep?: number;
    totalSteps?: number;
    steps?: string[];
    onBack?: () => void;
    className?: string;
    backgroundImage?: string;
}

export function RoyalFormLayout({
    children,
    title,
    subtitle,
    showStep = false,
    currentStep = 1,
    totalSteps = 1,
    steps,
    onBack,
    className,
    backgroundImage
}: RoyalFormLayoutProps) {
    const bgSrc = backgroundImage || '/bg-onboarding.webp';

    return (
        // Outer wrapper: scrollable content, NO bg-image here
        // bg-image on a scrolling element stretches on mobile / iOS
        <div className="relative min-h-[100dvh] flex flex-col items-center py-6 px-2 md:py-10 md:px-4 font-sans text-neutral-200 bg-black">

            {/* Fixed-position background layer — always covers the viewport, never stretches */}
            <div
                aria-hidden="true"
                className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${bgSrc})` }}
            />
            {/* Dark overlay for readability on top of BG */}
            <div aria-hidden="true" className="fixed inset-0 -z-10 bg-black/60" />

            {/* --- Main Card Container (Glass Black) --- */}
            <div className="w-full max-w-4xl bg-black/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">

                {/* Signature top accent bar */}
                <div className="h-1 bg-gradient-to-r from-red-900 via-[#D4AF37] to-red-900" />

                <div className="p-4 md:p-12">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className={cn(
                            "text-3xl md:text-4xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] tracking-tight mb-2",
                            cinzel.className
                        )}>
                            {title}
                        </h1>
                        {subtitle && <p className="text-neutral-400 font-medium tracking-wide">{subtitle}</p>}

                        {(showStep && steps) && (
                            <p className="text-neutral-500 font-medium text-xs uppercase tracking-widest mt-2">
                                Step {currentStep} of {totalSteps}: {steps[currentStep - 1]}
                            </p>
                        )}
                    </div>

                    {/* Progress circles (desktop only) */}
                    {(showStep && steps && totalSteps > 0) && (
                        <div className="mb-8 hidden md:flex justify-between px-10">
                            {steps.map((label, idx) => {
                                const stepNum = idx + 1;
                                const isActive = stepNum === currentStep;
                                const isCompleted = stepNum < currentStep;

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                                            isActive
                                                ? "bg-red-600 border-red-600 text-white scale-110 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                                : isCompleted
                                                    ? "bg-green-500/20 border-green-500 text-green-400"
                                                    : "bg-white/5 border-white/10 text-neutral-500"
                                        )}>
                                            {isCompleted ? "✓" : stepNum}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Form Content */}
                    <div className={cn(className)}>
                        {children}
                    </div>

                </div>
            </div>

            {/* Bottom spacer so content doesn't stick to edge on short phones */}
            <div className="h-8" />
        </div>
    );
}

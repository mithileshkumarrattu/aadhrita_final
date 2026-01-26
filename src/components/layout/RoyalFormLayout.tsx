'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
// We can use the same fonts, but the styling will change drastically
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
    className?: string; // For the inner container
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
    return (
        <div className={cn(
            "min-h-screen flex flex-col items-center py-6 px-2 md:py-10 md:px-4 bg-black bg-cover bg-center bg-fixed"
        )}
            style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
        >
            {/* --- Main Card Container (White with Shadow) --- */}
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">

                {/* --- The Signature Top Bar (Red-Yellow-Red Gradient) --- */}
                <div className="h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600" />

                <div className="p-4 md:p-12">

                    {/* Header Section */}
                    <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h1 className={cn(
                            "text-3xl md:text-4xl font-black uppercase text-red-700 tracking-tight mb-2",
                            cinzel.className
                        )}>
                            {title}
                        </h1>
                        {subtitle && <p className="text-gray-500 font-medium">{subtitle}</p>}

                        {/* Step Indicator Text (e.g., "Step 1 of 4: Basic Details") */}
                        {(showStep && steps) && (
                            <p className="text-gray-400 font-medium text-sm mt-1">
                                Step {currentStep} of {totalSteps}: {steps[currentStep - 1]}
                            </p>
                        )}
                    </div>

                    {/* Progress Bar (Visual Circles) - Optional override or use the text above */}
                    {(showStep && steps && totalSteps > 0) && (
                        <div className="mb-8 hidden md:flex justify-between px-10">
                            {steps.map((label, idx) => {
                                const stepNum = idx + 1;
                                const isActive = stepNum === currentStep;
                                const isCompleted = stepNum < currentStep;

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                                            isActive
                                                ? "bg-red-600 border-red-600 text-white scale-110 shadow-md"
                                                : isCompleted
                                                    ? "bg-green-100 border-green-500 text-green-700"
                                                    : "bg-gray-50 border-gray-200 text-gray-400"
                                        )}>
                                            {isCompleted ? "✓" : stepNum}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* --- Form Content --- */}
                    <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", className)}>
                        {children}
                    </div>

                </div>
            </div>
        </div>
    );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepWizardProps {
    steps: string[];
    currentStep: number;
}

export function StepWizard({ steps, currentStep }: StepWizardProps) {
    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/10 -z-10" />

                {steps.map((label, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum === currentStep;
                    const isCompleted = stepNum < currentStep;

                    return (
                        <div key={label} className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-lg border-2",
                                    isActive
                                        ? "bg-yellow-400 border-yellow-400 text-black scale-110"
                                        : isCompleted
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "bg-[#2d1b4e] border-white/20 text-white/40"
                                )}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
                            </div>
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider text-center max-w-[80px]",
                                isActive ? "text-yellow-400" : isCompleted ? "text-green-400" : "text-white/30"
                            )}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

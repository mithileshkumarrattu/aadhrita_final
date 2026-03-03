'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function SponsorsSection() {
    return (
        <div className="w-full flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 mt-12 mb-8">
            <div className="flex items-center gap-4 opacity-100 w-full">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#b91c1c] to-[#DAD0BD]" />
                <span className={cn("text-xl md:text-2xl font-bold uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] drop-shadow-sm", cinzel.className)}>
                    Our Sponsors
                </span>
                <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#b91c1c] to-[#DAD0BD]" />
            </div>

            <div className="flex flex-wrap justify-center gap-6 md:gap-12 px-4 w-full max-w-5xl mx-auto">
                {/* Netmaxin - Needs white bg since logo is dark text */}
                <div className="flex flex-col items-center gap-4 group cursor-pointer">
                    <div className="relative w-[80vw] sm:w-[300px] h-[160px] bg-white rounded-3xl p-6 flex items-center justify-center shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-200 opacity-90" />
                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                            <Image
                                src="/Logo Design Sec.png"
                                alt="Netmaxin Logo"
                                fill
                                className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Canara Bank - White bg */}

                <div className="flex flex-col items-center gap-4 group cursor-pointer">
                    <div className="relative w-[80vw] sm:w-[300px] h-[160px] bg-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-200 opacity-90" />
                        <div className="relative z-10 w-[95%] h-[95%] flex items-center justify-center">
                            <Image
                                src="/IMG_0072.PNG"
                                alt="Canara Bank Logo"
                                fill
                                unoptimized
                                className="object-contain p-0 group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Between Breaks - White bg */}
                <div className="flex flex-col items-center gap-4 group cursor-pointer">
                    <div className="relative w-[80vw] sm:w-[300px] h-[160px] bg-white rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-200 opacity-90" />
                        <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 w-[85%] h-[85%] flex items-center justify-center">
                            <Image
                                src="/bb-app-logo.webp"
                                alt="Between Breaks Logo"
                                fill
                                className="object-contain p-0 scale-105 group-hover:scale-[1.15] drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

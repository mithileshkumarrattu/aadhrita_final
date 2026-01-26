'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function RoyalGateLoader({ onOpenComplete }: { onOpenComplete?: () => void }) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate asset loading heavy feel
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000); // 2s load time for dramatic effect

        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence onExitComplete={onOpenComplete}>
            {isLoading && (
                <div className="fixed inset-0 z-[9999] pointer-events-none flex">
                    {/* Left Gate */}
                    <motion.div
                        initial={{ x: 0 }}
                        exit={{ x: '-100%', transition: { duration: 1.5, ease: [0.55, 0.08, 0.68, 0.53] } }} // circIn-ish feel
                        className="w-1/2 h-full relative border-r-4 border-[#C5A059]"
                        style={{
                            background: '#0a0a0a',
                            boxShadow: 'inset -20px 0 50px rgba(0,0,0,0.9)'
                        }}
                    >
                        {/* Steel Texture Overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />

                        {/* Rivets/Bolts */}
                        <div className="absolute top-[10%] right-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-800 shadow-[2px_2px_4px_black]" />
                        <div className="absolute bottom-[10%] right-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-800 shadow-[2px_2px_4px_black]" />
                        <div className="absolute top-[50%] right-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-800 shadow-[2px_2px_4px_black]" />

                        {/* Ornamental Lion/Emblem Left Half (CSS Wrapper) */}
                        <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-48 h-48 border-8 border-[#C5A059] rounded-full opacity-20 pointer-events-none" />

                    </motion.div>

                    {/* Right Gate */}
                    <motion.div
                        initial={{ x: 0 }}
                        exit={{ x: '100%', transition: { duration: 1.5, ease: [0.55, 0.08, 0.68, 0.53] } }}
                        className="w-1/2 h-full relative border-l-4 border-[#C5A059]"
                        style={{
                            background: '#0a0a0a',
                            boxShadow: 'inset 20px 0 50px rgba(0,0,0,0.9)'
                        }}
                    >
                        {/* Steel Texture Overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />

                        {/* Rivets/Bolts */}
                        <div className="absolute top-[10%] left-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-800 shadow-[2px_2px_4px_black]" />
                        <div className="absolute bottom-[10%] left-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-800 shadow-[2px_2px_4px_black]" />
                        <div className="absolute top-[50%] left-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-800 shadow-[2px_2px_4px_black]" />
                    </motion.div>

                    {/* Center Emblem - Fades out before gates open completely */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.5 } }}
                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="relative">
                            <div className="w-64 h-64 bg-black rounded-full blur-[60px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-32 h-32 relative animate-pulse">
                                    <img
                                        src="/AFT.png"
                                        alt="Loading..."
                                        className="object-contain w-full h-full drop-shadow-[0_0_15px_#C5A059]"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

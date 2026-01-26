'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, Info, Users, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function FloatingHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { label: 'Home', path: '/', icon: Home },
        { label: 'About', path: '/about', icon: Info },
        { label: 'Team', path: '/team', icon: Users },
    ];

    return (
        <>
            {/* DESKTOP: Centered Pill Navbar */}
            <div className="hidden md:flex fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl hover:border-[#D4AF37]/50 transition-colors">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <React.Fragment key={item.path}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(item.path)}
                                    className={cn(
                                        "rounded-full text-sm font-medium transition-all duration-300 px-4",
                                        isActive
                                            ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                            : "text-neutral-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span className={cn("mr-2", isActive && "text-[#D4AF37]")}>
                                        <item.icon className="w-4 h-4" />
                                    </span>
                                    {item.label}
                                </Button>
                                {/* Separator */}
                                {item.label !== 'Team' && (
                                    <div className="w-px h-4 bg-white/10 mx-1" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* MOBILE: Hamburger Button (Top Center to avoid logo clash) */}
            <div className="md:hidden fixed top-6 left-1/2 -translate-x-1/2 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(true)}
                    className="bg-black/50 backdrop-blur-md text-white border border-white/10 rounded-full hover:bg-black/70 w-12 h-12"
                >
                    <Menu className="w-6 h-6" />
                </Button>
            </div>

            {/* MOBILE: Fullscreen Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(false)}
                            className="absolute top-6 right-6 text-neutral-400 hover:text-white w-12 h-12"
                        >
                            <X className="w-8 h-8" />
                        </Button>

                        {/* Logo / Title in Mobile Menu */}
                        <div className="mb-12 text-center">
                            <h2 className={cn("text-4xl text-[#D4AF37] font-bold", cinzel.className)}>AADHRITA</h2>
                            <span className={cn("text-neutral-500 tracking-[0.5em] text-sm")}>2026</span>
                        </div>

                        <div className="flex flex-col gap-8 w-full max-w-xs text-center">
                            {navItems.map((item, idx) => (
                                <motion.div
                                    key={item.path}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                >
                                    <button
                                        onClick={() => {
                                            router.push(item.path);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "text-3xl font-medium transition-all duration-300 hover:text-[#D4AF37]",
                                            pathname === item.path ? "text-white scale-110" : "text-neutral-500",
                                            cinzel.className
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

'use client';

import * as React from 'react';
import { Home, Calendar, Ticket, CreditCard, Coins } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    // New Requirement: Remove BottomNav on Event Pages
    if (pathname.startsWith('/events')) return null;

    const { user } = useAuth();

    // Hide on login page, admin pages, or registration pages, and public about pages
    if (!user || pathname === '/' || pathname?.startsWith('/admin') || pathname?.startsWith('/register') || pathname?.startsWith('/enrollment') || pathname === '/about' || pathname === '/team') return null;

    const navItems = [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Pay', path: '/pay', icon: CreditCard },
        { label: 'AFT', path: '/aft', icon: Coins }, // Place AFT here or create icon
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
            <div className="flex items-center gap-1 p-2 bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-[2rem] transition-all duration-500 ease-in-out",
                                isActive
                                    ? "bg-black text-white shadow-lg w-auto"
                                    : "text-zinc-400 hover:bg-zinc-100/80 hover:text-zinc-600 w-12 justify-center"
                            )}
                        >
                            <item.icon
                                className={cn("w-5 h-5 flex-shrink-0", isActive ? "stroke-[2.5px]" : "stroke-2")}
                            />

                            <span className={cn(
                                "whitespace-nowrap overflow-hidden transition-all duration-500 text-xs font-bold tracking-wide",
                                isActive ? "w-auto opacity-100 max-w-[100px]" : "w-0 opacity-0 max-w-0"
                            )}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

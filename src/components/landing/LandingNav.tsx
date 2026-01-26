'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'] });

export function LandingNav() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/10">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#C5A059] flex items-center justify-center font-bold text-black border border-white/20">
                    M
                </div>
                <span className={cn("text-xl font-bold text-white tracking-wide", playfair.className)}>
                    MVGR
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <Link href="/login">
                    <Button variant="ghost" className="text-white hover:text-[#C5A059] hover:bg-white/5 font-bold">
                        Login
                    </Button>
                </Link>
                <Link href="/signup">
                    <Button className="bg-[#C5A059] text-black hover:bg-[#b08d4a] font-bold rounded-full px-6">
                        Register
                    </Button>
                </Link>
            </div>
        </nav>
    );
}

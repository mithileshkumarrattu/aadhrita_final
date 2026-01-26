'use client';

import { cn } from '@/lib/utils';
import { Playfair_Display, Inter } from 'next/font/google';
import { Lock } from 'lucide-react';

const playfair = Playfair_Display({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

const EVENTS = [
    { id: 1, title: 'Hackathon', desc: '24 Hour Coding Challenge', date: 'Day 1', color: 'bg-blue-900' },
    { id: 2, title: 'Cultural Night', desc: 'Dance & Music Performances', date: 'Day 1', color: 'bg-rose-900' },
    { id: 3, title: 'Pro Show', desc: 'DJ Night & Live Band', date: 'Day 2', color: 'bg-purple-900' },
    { id: 4, title: 'Sports Meet', desc: 'Inter-College Tournament', date: 'Day 2', color: 'bg-emerald-900' },
    { id: 5, title: 'Food Carnival', desc: 'Stalls & Exhibitions', date: 'Day 3', color: 'bg-amber-900' },
];

export function FirmanCardCarousel() {
    return (
        <div className="py-16 bg-[#0B0C10] relative z-20">

            <div className="px-6 mb-8 relative z-10">
                <h2 className={cn("text-white text-3xl font-bold mb-2", inter.className)}>Featured Events</h2>
                <div className="w-16 h-1 bg-[#C5A059] rounded-full" />
            </div>

            <div className="overflow-x-auto flex gap-4 px-6 pb-8 snap-x snap-mandatory scrollbar-hide">
                {EVENTS.map((evt) => (
                    <div
                        key={evt.id}
                        className="flex-shrink-0 snap-center w-[240px] h-[340px] relative rounded-2xl overflow-hidden shadow-lg group border border-white/10"
                    >
                        {/* Card Background Color */}
                        <div className={cn("absolute inset-0 z-0 opacity-80", evt.color)} />

                        {/* Gradient Overlay for Readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />

                        {/* LOCK OVERLAY (Visible on Hover or Default?) User said "normally see lock icon and see coming soon". */}
                        {/* I will make it visible by default or strongly on hover. "normally see lock icon" -> Default visible? */}
                        {/* "now they should only on hover and normally see lock icon" -> confuse grammar. */}
                        {/* Interpretation: "Previously they could click. Now, they cannot click. They should see a Lock icon and 'Coming Soon' (maybe on hover or always)." */}
                        {/* I'll put a semi-transparent lock overlay always, or just the icon. */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-[2px] opacity-100 transition-opacity duration-300">
                            <Lock className="w-12 h-12 text-[#C5A059] mb-2 opacity-80" />
                            <span className="text-white font-bold tracking-widest uppercase text-sm border px-3 py-1 border-[#C5A059] rounded-full bg-black/50">Coming Soon</span>
                        </div>

                        {/* Content */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-end z-10 opacity-60 blur-[1px] group-hover:blur-0 group-hover:opacity-40 transition-all">
                            <span className="text-[#C5A059] text-xs font-bold uppercase tracking-widest mb-2">{evt.date}</span>
                            <h3 className={cn("text-2xl text-white font-bold leading-tight mb-2 tracking-wide drop-shadow-md", playfair.className)}>
                                {evt.title}
                            </h3>
                            <p className="text-gray-300 text-sm font-medium">{evt.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

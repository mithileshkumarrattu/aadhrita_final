'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';
import { ArrowLeft, ChevronRight, Terminal, Music, Trophy, Lightbulb, Camera, Cpu } from 'lucide-react';

const cinzel = Cinzel({ subsets: ['latin'] });

// Categories Configuration
const CATEGORIES = [
    {
        id: 'tech-frontier',
        label: 'Tech Frontier',
        description: 'Robo Wars, Hardware Hacks & Drone Racing',
        icon: Cpu,
        image: '/assets/card-tech.jpg',
        gradient: 'from-amber-900 to-amber-700',
        isOnSpot: false
    },
    {
        id: 'skill-forge',
        label: 'Skill Forge',
        description: 'Elite Workshops: Quantum to Blockchain',
        icon: Lightbulb,
        image: '/assets/card-workshop.jpg',
        gradient: 'from-blue-900 to-blue-700',
        isOnSpot: false
    },
    {
        id: 'brainwave',
        label: 'Brainwave',
        description: 'Ideathons, CAD & Business Plans',
        icon: Terminal,
        image: '/assets/card-brainwave.jpg',
        gradient: 'from-emerald-900 to-emerald-700',
        isOnSpot: false
    },
    {
        id: 'cultural',
        label: 'Cultural',
        description: 'Dance, Music, Fashion & Theatre',
        icon: Music,
        image: '/assets/card-cultural.jpg',
        gradient: 'from-pink-900 to-pink-700',
        isOnSpot: false
    },
    {
        id: 'sports',
        label: 'Sports',
        description: 'Basketball, Volleyball & More',
        icon: Trophy,
        image: '/sports-internal.png',
        gradient: 'from-red-900 to-red-700',
        isOnSpot: true
    },
    {
        id: 'spot',
        label: 'Spot Events',
        description: 'Fun Games, Photography & E-Sports',
        icon: Camera,
        image: '/assets/card-spot.jpg',
        gradient: 'from-purple-900 to-purple-700',
        isOnSpot: true
    },
];

export default function EventsPage() {
    const router = useRouter();

    const standardCategories = CATEGORIES.filter(c => !c.isOnSpot);
    const onSpotCategories = CATEGORIES.filter(c => c.isOnSpot);

    return (
        <div className={cn("min-h-screen bg-black text-white font-sans selection:bg-red-500/30")}>
            {/* Simple Glow Effect instead of Image */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-900/20 blur-[120px] rounded-full pointer-events-none z-0" />

            <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-12">

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </button>
                        <div>
                            <h1 className={cn("text-3xl md:text-5xl font-black uppercase text-white", cinzel.className)}>
                                Events
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase">Select a Category</p>
                        </div>
                    </div>
                </div>

                {/* SECTION 1: REGISTRATIONS OPEN */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-6 bg-[#D4AF37]" />
                        <h2 className={cn("text-xl font-bold uppercase tracking-widest text-zinc-300", cinzel.className)}>
                            Registrations Open
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {standardCategories.map((cat) => (
                            <div
                                key={cat.id}
                                onClick={() => router.push(`/events/${cat.id}`)}
                                className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 hover:border-[#D4AF37] transition-all duration-500 shadow-lg hover:shadow-[#D4AF37]/20"
                            >
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0">
                                    <Image
                                        src={cat.image}
                                        alt={cat.label}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110 grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                </div>

                                {/* Content */}
                                <div className="relative z-10 h-full flex flex-col justify-end p-4 md:p-6">
                                    <div className="flex justify-between items-end">
                                        <div className="flex-1">
                                            <div className="w-10 h-10 mb-3 rounded-lg bg-[#D4AF37]/20 backdrop-blur-md flex items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37]">
                                                <cat.icon className="w-5 h-5" />
                                            </div>
                                            <h3 className={cn("text-xl md:text-2xl font-black uppercase leading-none mb-1 text-white", cinzel.className)}>
                                                {cat.label}
                                            </h3>
                                            <p className="text-[10px] md:text-xs text-zinc-400 font-medium line-clamp-2 md:line-clamp-none">
                                                {cat.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Arrow indicator */}
                                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SECTION 2: ON-SPOT REGISTRATIONS */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-6 bg-red-600" />
                        <h2 className={cn("text-xl font-bold uppercase tracking-widest text-zinc-300", cinzel.className)}>
                            On-Spot / Offline
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {onSpotCategories.map((cat) => (
                            <div
                                key={cat.id}
                                onClick={() => router.push(`/events/${cat.id}`)}
                                className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 hover:border-red-600 transition-all duration-500 shadow-lg hover:shadow-red-900/40"
                            >
                                {/* Background */}
                                <div className="absolute inset-0 z-0">
                                    <Image
                                        src={cat.image}
                                        alt={cat.label}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                </div>

                                {/* Content: No Icons, No Arrows */}
                                <div className="relative z-10 h-full flex flex-col justify-end p-5 text-center">
                                    <h3 className={cn("text-2xl font-black uppercase tracking-wider text-white group-hover:text-red-500 transition-colors drop-shadow-md", cinzel.className)}>
                                        {cat.label}
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-1 font-medium tracking-widest uppercase">
                                        Offline Only
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}

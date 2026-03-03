'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

// Static categories in the exact order requested
const STATIC_CATEGORIES = [
    { id: 'tech-frontier', label: 'Tech Frontier Challenges', description: 'Robo Race, Drone Tech, Debates', image: '/assets/tech-frontier.jpg' },
    { id: 'brainwave', label: 'Brain Wave Challenges', description: 'Code Quest, Ideathon, Symposium', image: '/assets/brainwave.jpg' },
    { id: 'skill-forge', label: 'Skill Forge Workshops', description: 'Blockchain, Electronics', image: '/assets/skill-forge.jpg' },
    { id: 'multimedia', label: 'Multi Media & E-Sports', description: 'Photography, Reels, Gaming', image: '/assets/spot events.jpg' },
    { id: 'cultural', label: 'Cultural Events', description: 'Dance, Music, Fashion Show', image: '/assets/culturals.jpg' },
    { id: 'sports', label: 'Sports', description: 'Volleyball, Basketball, Throwball', image: '/assets/sports.jpg' },
];

export default function CategoriesGrid() {
    const router = useRouter();

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
            {STATIC_CATEGORIES.map((cat) => (
                <div
                    key={cat.id}
                    onClick={() => router.push(`/events/${cat.id}`)}
                    className="group relative w-full aspect-[2/3] bg-black/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 overflow-hidden hover:shadow-[0_0_50px_rgba(220,38,38,0.2)] hover:scale-[1.02] transition-all duration-700 flex flex-col justify-end cursor-pointer"
                >
                    {/* Background Image */}
                    <Image
                        src={cat.image || '/final.png'}
                        alt={cat.label}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlay (Minimal for text readability at bottom only) */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 p-8 flex flex-col items-start gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <h3 className={cn("text-3xl font-black uppercase tracking-tight text-white leading-none drop-shadow-md", cinzel.className)}>
                            {cat.label}
                        </h3>
                        <p className="text-sm font-medium text-neutral-300 line-clamp-2 max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            {cat.description}
                        </p>
                    </div>

                    {/* Golden Border Glow */}
                    <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] group-hover:border-[#D4AF37]/30 transition-colors duration-500" />
                </div>
            ))}
        </div>
    );
}

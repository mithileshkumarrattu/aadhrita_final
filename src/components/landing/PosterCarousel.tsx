'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Poster {
    id: string;
    imageUrl: string;
    order: number;
}

export default function PosterCarousel() {
    const [posters, setPosters] = useState<Poster[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosters = async () => {
            try {
                const q = query(collection(db, 'landing_carousel'), orderBy('order', 'asc'));
                const snap = await getDocs(q);
                setPosters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poster)));
            } catch (e) {
                console.error("Failed to fetch carousel", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPosters();
    }, []);

    if (loading) return null; // Or a skeleton, but for hero carousel blank is better than flicker
    if (posters.length === 0) return null;

    return (
        <section className="w-full relative z-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Section Title (Optional, keeping it clean for now as it's below Hero) */}

            {/* Carousel Container */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 pt-4 px-4 md:px-0 no-scrollbar touch-pan-x items-center justify-start md:justify-center">
                {posters.map((poster, idx) => (
                    <div
                        key={poster.id}
                        className="snap-center shrink-0 relative group rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-500 hover:scale-[1.02] w-[85vw] md:w-[600px] aspect-video bg-black"
                    >
                        <Image
                            src={poster.imageUrl}
                            alt={`Poster ${idx + 1}`}
                            fill
                            className="object-cover group-hover:opacity-90 transition-opacity duration-500"
                        />
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    </div>
                ))}
            </div>

            {/* Pagination Dots (Visual Only if needed, simpler without for now) */}
        </section>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { collection, getDocs } from 'firebase/firestore';
import { EVENT_CATEGORIES as DEFAULT_CATEGORIES } from '@/lib/constants'; // Fallback
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';
import { ChevronRight, Sparkles } from 'lucide-react';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function CategoriesGrid() {
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCats = async () => {
            try {
                const snap = await getDocs(collection(db, 'event_categories'));
                if (!snap.empty) {
                    const dbCats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setCategories(dbCats);
                } else {
                    setCategories(DEFAULT_CATEGORIES);
                }
            } catch (e) {
                console.error("Failed to fetch categories, using default", e);
                setCategories(DEFAULT_CATEGORIES);
            } finally {
                setLoading(false);
            }
        };
        fetchCats();
    }, []);

    // Skeleton
    if (loading) {
        return <div className="text-white text-center">Loading Categories...</div>;
    }

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
            {categories.map((cat, idx) => (
                <div
                    key={cat.id}
                    className="group relative w-full aspect-[3/4] md:aspect-[4/5] bg-black/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 overflow-hidden hover:shadow-[0_0_50px_rgba(220,38,38,0.2)] hover:scale-[1.02] transition-all duration-700 flex flex-col justify-end"
                >
                    {/* Background Image */}
                    <Image
                        src={cat.image || '/final.png'}
                        alt={cat.label}
                        fill
                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700 group-hover:scale-110 transform"
                    />

                    {/* Gradient Overlay (Glassmorphism) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 p-8 flex flex-col items-start gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">

                        {/* Status Badge (Static) */}
                        <div className="absolute -top-12 left-0 right-0 flex justify-center opacity-100 translate-y-12">
                            <span className="bg-neutral-800 text-neutral-300 text-xs font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/10">
                                <ChevronRight className="w-3 h-3 text-[#D4AF37]" /> ✨ Registrations opening soon
                            </span>
                        </div>

                        <h3 className={cn("text-3xl font-black uppercase tracking-tight text-white leading-none drop-shadow-md", cinzel.className)}>
                            {cat.label}
                        </h3>
                        <p className="text-sm font-medium text-neutral-300 line-clamp-2 max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            {cat.description}
                        </p>

                        {/* Removed Enter Zone Button */}
                    </div>

                    {/* Golden Border Glow */}
                    <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] group-hover:border-[#D4AF37]/30 transition-colors duration-500" />
                </div>
            ))}
        </div>
    );
}

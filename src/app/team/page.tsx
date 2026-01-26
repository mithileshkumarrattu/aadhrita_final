'use client';

import React, { useEffect, useState } from 'react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Loader2, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { db, TeamMember } from '@/lib/db';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function TeamPage() {
    const router = useRouter();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                // Fetch ALL members, sorted by order
                const q = query(collection(db, 'team_members'), orderBy('order', 'asc'));
                const snap = await getDocs(q);
                setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to load team");
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, []);

    // Helper to group members by category
    const groupMembers = (requestedCategory: string) => {
        return members.filter(m => m.category === requestedCategory);
    };

    // Note: The Admin Panel allows creating these categories dynamically now.
    // We define the display order here.
    // Dynamic Category Extraction (using Set to keep fetching order)
    // Dynamic Category Extraction: Sort Categories by the lowest 'order' of their members
    const categoryMinOrder: Record<string, number> = {};
    members.forEach(m => {
        if (categoryMinOrder[m.category] === undefined) {
            categoryMinOrder[m.category] = m.order || 999;
        } else {
            categoryMinOrder[m.category] = Math.min(categoryMinOrder[m.category], m.order || 999);
        }
    });

    const availableCategories = Object.keys(categoryMinOrder).sort((a, b) => categoryMinOrder[a] - categoryMinOrder[b]);

    return (
        <div className={cn("min-h-screen bg-[#050505] text-white selection:bg-red-500/30")}>
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <div className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="block md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70" style={{ backgroundImage: "url('/final.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-black/60" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
                <Button variant="ghost" onClick={() => router.push('/')} className="mb-12 text-neutral-400 hover:text-white pl-0 hover:bg-transparent relative z-50">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                <h1 className={cn("text-5xl md:text-7xl font-black uppercase mb-4 text-center text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e15]", cinzel.className)}>
                    Team Aadhrita
                </h1>
                <p className="text-center text-neutral-400 mb-20 max-w-2xl mx-auto">
                    The visionaries, organizers, and executors behind Aadhrita 2026.
                </p>

                {error && (
                    <div className="text-center text-red-500 mb-10 p-4 border border-red-500/20 bg-red-500/10 rounded-lg">
                        Error: {error}. <br /> You may need to be logged in to view team details if database rules are restricted.
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center h-48 items-center"><Loader2 className="animate-spin text-[#D4AF37] w-10 h-10" /></div>
                ) : (
                    <div className="space-y-24">
                        {availableCategories.map((category) => {
                            const categoryMembers = groupMembers(category);
                            if (categoryMembers.length === 0) return null;

                            return (
                                <section key={category} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <h2 className={cn("text-xl md:text-3xl font-bold text-white mb-12 text-center uppercase tracking-widest relative flex justify-center", cinzel.className)}>
                                        <span className="relative z-10 px-6 md:px-10 bg-[#050505] border border-[#D4AF37]/30 py-2 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.1)] inline-block max-w-[90vw] whitespace-normal break-words text-center leading-relaxed">
                                            {category}
                                        </span>
                                        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent -z-0" />
                                    </h2>

                                    <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                                        {categoryMembers.map(m => {
                                            const hasImage = !!m.imageUrl && m.imageUrl.trim() !== '';

                                            // Helper to render designation with comma line breaks
                                            const renderDesignation = (des: string) => {
                                                return des.split(',').map((part, index, array) => (
                                                    <React.Fragment key={index}>
                                                        {part.trim()}
                                                        {index < array.length - 1 && <>,<br /></>}
                                                    </React.Fragment>
                                                ));
                                            };

                                            // 1. Text-Only Layout (Card)
                                            if (!hasImage) {
                                                return (
                                                    <div key={m.id} className="group relative w-64 p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-[#D4AF37]/50 transition-all duration-300 hover:-translate-y-1">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]/20 group-hover:bg-[#D4AF37] transition-colors" />
                                                        <h3 className={cn("text-lg font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors", cinzel.className)}>{m.name}</h3>
                                                        {m.designation && <p className="text-xs text-[#D4AF37] uppercase tracking-wider font-bold mb-1 leading-relaxed">{renderDesignation(m.designation)}</p>}
                                                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium whitespace-pre-wrap leading-relaxed">{m.role}</p>
                                                        {m.phone && (
                                                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center text-xs text-[#D4AF37]">
                                                                <Phone className="w-3 h-3 mr-1" /> {m.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // 2. Image Layout (Circle)
                                            return (
                                                <div key={m.id} className="group flex flex-col items-center text-center w-64">
                                                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-[#D4AF37]/30 p-1 mb-4 relative overflow-hidden bg-black group-hover:border-[#D4AF37] transition-all duration-500 shadow-[0_0_20px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]">
                                                        <Image src={m.imageUrl!} alt={m.name} fill className="object-cover rounded-full transition-all duration-500" />
                                                    </div>
                                                    <h3 className={cn("text-lg font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors", cinzel.className)}>{m.name}</h3>
                                                    {m.designation && <p className="text-xs text-[#D4AF37] uppercase tracking-wider font-bold mb-0.5 leading-relaxed">{renderDesignation(m.designation)}</p>}
                                                    <p className="text-sm text-neutral-500 uppercase tracking-wider font-medium mb-1 whitespace-pre-wrap leading-relaxed">{m.role}</p>
                                                    {m.phone && (
                                                        <a href={`tel:${m.phone}`} className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 justify-center">
                                                            <Phone className="w-3 h-3" /> {m.phone}
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

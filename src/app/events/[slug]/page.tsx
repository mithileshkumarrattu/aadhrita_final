'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, MapPin, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { db, getEvents, getUserEventRegistrations, Event } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { CoinLoader } from '@/components/ui/CoinLoader';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const categorySlug = params.slug as string;

    const [events, setEvents] = useState<Event[]>([]);
    const [registeredIds, setRegisteredIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                // 1. Fetch Events for this Category
                // Note: Category slugs might need mapping to DB category fields if they differ. 
                // Assuming exact match or simple mapping for now.
                const categoryMap: Record<string, string> = {
                    'tech-frontier': 'Technical',
                    'skill-forge': 'Workshop',
                    'brainwave': 'Non-Technical', // or Management?
                    'cultural': 'Cultural',
                    'sports': 'Sports',
                    'spot': 'Spot',
                    'flagship': 'Flagship'
                };

                const dbCategory = categoryMap[categorySlug] || 'Technical'; // Default fallback
                const allEvents = await getEvents(); // Fetch all active events and filter client side if needed, or update getEvents to accept category

                // Client side filter for exact category match
                const filtered = allEvents.filter(e => {
                    // Normalize category checking
                    const c = e.category || '';
                    if (c === dbCategory) return true;
                    if (c.toLowerCase() === categorySlug.replace(/-/g, ' ')) return true;
                    return false;
                });
                setEvents(filtered);

                // 2. Fetch User Registrations
                if (user) {
                    const regs = await getUserEventRegistrations(user.uid);
                    setRegisteredIds(regs.map((r: any) => r.eventId));
                }
            } catch (error) {
                console.error("Failed to load events", error);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, [categorySlug, user]);

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><CoinLoader text="Loading Events..." /></div>;

    return (
        <div className={cn("min-h-screen bg-[#050505] text-white p-4 pb-20 selection:bg-red-500/30")}>
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/events')} className="text-neutral-400 hover:text-white pl-0 hover:bg-transparent">
                        <ArrowLeft className="w-6 h-6 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className={cn("text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600", cinzel.className)}>
                            {categorySlug.replace(/-/g, ' ')}
                        </h1>
                    </div>
                </div>

                {/* Events Grid */}
                {events.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => {
                            const isRegistered = registeredIds.includes(event.id!);
                            return (
                                <div
                                    key={event.id}
                                    onClick={() => router.push(isRegistered ? `/events/details/${event.id}` : `/events/${event.id}/register`)}
                                    className={cn(
                                        "group relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-amber-500/50 transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden",
                                        isRegistered && "border-green-800/50 bg-green-900/10"
                                    )}
                                >
                                    {/* Registered Badge */}
                                    {isRegistered && (
                                        <div className="absolute top-4 right-4 z-20 bg-green-500 text-black text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-green-900/50">
                                            <CheckCircle2 className="w-3 h-3" /> Registered
                                        </div>
                                    )}

                                    <div className="relative h-40 w-full mb-4 rounded-xl overflow-hidden bg-zinc-800">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                                        {/* Fallback Image Logic */}
                                        <img src={event.imagePosterUrl || '/final.png'} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

                                        <div className="absolute bottom-3 left-3 z-20">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-black/50 backdrop-blur px-2 py-1 rounded border border-amber-500/30">
                                                {event.category}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-amber-500 transition-colors line-clamp-2">{event.title}</h3>

                                    <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.schedule || 'Date TBA'}</div>
                                        <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.minTeamSize}-{event.maxTeamSize} Team</div>
                                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.venue || 'MVGR'}</div>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800">
                                        <div className="text-lg font-black text-white">
                                            {event.entryFeeInr > 0 ? `₹${event.entryFeeInr}` : 'Free'}
                                        </div>
                                        <Button size="sm" className={cn("rounded-lg font-bold text-xs uppercase", isRegistered ? "bg-green-600 hover:bg-green-700" : "bg-white text-black hover:bg-zinc-200")}>
                                            {isRegistered ? "View" : "Register"} <ChevronRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
                        <p className="text-zinc-500 font-medium mb-4">No events found in {categorySlug} yet.</p>
                        <Button variant="link" className="text-amber-500" onClick={() => router.push('/events')}>Browse all categories</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

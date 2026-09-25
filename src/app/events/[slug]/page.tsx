'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, MapPin, Users, ChevronRight, CheckCircle2, FileText, Smartphone } from 'lucide-react';
import { db, getEvents, getUserEventRegistrations, Event } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { CoinLoader } from '@/components/ui/CoinLoader';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const { user, googleLogin } = useAuth();
    const categorySlug = params.slug as string;

    const [events, setEvents] = useState<Event[]>([]);
    const [registeredIds, setRegisteredIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip DB fetch for Sports
        if (categorySlug === 'sports') {
            setLoading(false);
            return;
        }

        const loadEvents = async () => {
            try {
                // 1. Fetch Events for this Category
                // Note: Category slugs from URL need precise mapping to DB 'category' field
                const categoryMap: Record<string, string[]> = {
                    'tech-frontier': ['Tech Frontier', 'Tech Frontier Challenges'],
                    'skill-forge': ['Skill Forge', 'Skill Forge Workshops'],
                    'brainwave': ['Brainwave', 'Brain Wave', 'Brain Wave Challenges'],
                    'cultural': ['Cultural', 'Cultural Events'],
                    'sports': ['Sports'],
                    'spot': ['Spot', 'Spot Events'],
                    'multimedia': ['Multi Media', 'E-Sports', 'Multi Media & E-Sports'],
                    'flagship': ['Flagship']
                };

                const validCategories = categoryMap[categorySlug?.toLowerCase()] || ['Technical']; // Default fallback
                const allEvents = await getEvents();

                // Client side filter for category match
                // Explicitly exclude hackathon and flagship docs — these have their own pages
                const filtered = allEvents.filter(e => {
                    const cat = (e.category || '').toLowerCase();
                    const id = (e.id || '').toLowerCase();
                    // Never show hackathon or flagship on category browse, and hide cancelled events
                    if (cat.includes('hackathon') || cat.includes('flagship') || id === 'hackathon' || e.status === 'cancelled') return false;
                    // Match by valid category
                    return validCategories.some(validCat =>
                        cat.includes(validCat.toLowerCase()) ||
                        validCat.toLowerCase().includes(cat)
                    );
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

    const handleRegister = async () => {
        if (!user) {
            await googleLogin('/register/onboarding');
        } else {
            router.push('/register/onboarding');
        }
    };

    const handleFreeFire = async () => {
        if (!user) {
            await googleLogin('/enrollment/freefire');
        } else {
            router.push('/enrollment/freefire');
        }
    };

    // Handle Sports Specifically
    if (categorySlug === 'sports') {
        const title = "SPORTS";
        const sportsEvents = [
            { id: 'throwball', title: "Throwball (Women's)", desc: "Show your team spirit and agility in this exciting throwball tournament." },
            { id: 'basketball', title: "Basketball (Men's)", desc: "Dribble, shoot, and score! Join the basketball challenge." },
            { id: 'volleyball', title: "Volleyball (Men's)", desc: "Spike your way to victory in the volleyball championship." },
        ];

        return (
            <div className={cn("min-h-screen bg-[#050505] text-white p-4 pb-20 selection:bg-red-500/30")}>
                {/* Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
                </div>

                <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Header */}
                    <div className="flex items-center gap-4 mt-8">
                        <Button variant="ghost" onClick={() => router.push('/')} className="text-neutral-400 hover:text-white pl-0 hover:bg-transparent">
                            <ArrowLeft className="w-6 h-6 mr-2" /> Back to Home
                        </Button>
                        <div>
                            <h1 className={cn("text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600", cinzel.className)}>
                                {title}
                            </h1>
                        </div>
                    </div>

                    {/* Offline Banner */}
                    <div className="p-8 rounded-3xl border border-amber-500/30 bg-amber-500/5 text-center space-y-6 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/50 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 mb-2 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            <Users className="w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-lg">
                                Offline Registrations Only
                            </h2>
                            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                                Registration for all sports events is being conducted offline. Teams must verify their participation at the sports registration desk on campus.
                            </p>
                        </div>

                        <div className="pt-4 flex flex-col items-center gap-3">
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono text-sm hover:border-zinc-700 transition-colors">
                                <Smartphone className="w-4 h-4 text-green-500" />
                                <span>Faculty Coordinator: <span className="text-white font-bold tracking-wide">VARUN</span> &nbsp;|&nbsp; <a href="tel:+919492021223" className="text-green-400 hover:underline font-bold">+91 94920 21223</a></span>
                            </div>
                            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Please Call for Queries</p>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sportsEvents.map((event) => (
                            <div
                                key={event.id}
                                className="group relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-amber-500/30 transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col gap-4 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="self-start mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-amber-400 border-amber-500/30 bg-amber-500/10">
                                            Offline
                                        </span>
                                    </div>

                                    <h3 className={cn("text-xl font-black text-white leading-tight mb-2 group-hover:text-amber-400 transition-colors", cinzel.className)}>
                                        {event.title}
                                    </h3>

                                    <p className="text-sm text-zinc-400 line-clamp-3 mb-4 leading-relaxed font-medium">
                                        {event.desc}
                                    </p>

                                    <div className="mt-auto space-y-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                                            <span>Venue: Sports Ground</span>
                                            <span>Time: TBA</span>
                                        </div>
                                        <Button size="sm" variant="secondary" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-[10px] tracking-wider cursor-default opacity-80">
                                            Registration at Desk
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Handle Multimedia with FreeFire Tournament
    if (categorySlug === 'multimedia') {
        const title = "MULTIMEDIA & E-SPORTS";
        const freeFireEvent = {
            id: 'freefire',
            title: "ASCENSION CUP 2026",
            tagline: "Rise. Dominate. Conquer.",
            desc: "MVGR College of Engineering proudly presents ASCENSION CUP 2026 - a high-octane Free Fire Esports Tournament conducted under official Free Fire Esports standards. This isn't just another campus event — it's a professionally managed esports showdown supervised by official Free Fire moderators and authorized clients, ensuring fair play, competitive integrity, and a true tournament-level experience.",
            fee: 400,
            limit: "144 Teams Only",
            deadline: "March 3, 2026 - 12:00 PM"
        };

        return (
            <div className={cn("min-h-screen bg-[#050505] text-white p-4 pb-20 selection:bg-red-500/30")}>
                {/* Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
                </div>

                <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Header */}
                    <div className="flex items-center gap-4 mt-8">
                        <Button variant="ghost" onClick={() => router.push('/')} className="text-neutral-400 hover:text-white pl-0 hover:bg-transparent">
                            <ArrowLeft className="w-6 h-6 mr-2" /> Back to Home
                        </Button>
                        <div>
                            <h1 className={cn("text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600", cinzel.className)}>
                                {title}
                            </h1>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* FreeFire Tournament Card */}
                        <div
                            className="group relative bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 hover:border-red-500/50 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col gap-4 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
                            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex gap-2 mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-red-400 border-red-500/30 bg-red-500/10">
                                        E-Sports
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-red-400 border-red-500/30 bg-red-500/10">
                                        FREEFIRE
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-amber-400 border-amber-500/30 bg-amber-500/10">
                                        {freeFireEvent.limit}
                                    </span>
                                </div>


                                <h3 className={cn("text-2xl font-black text-white leading-tight mb-1 group-hover:text-red-400 transition-colors", cinzel.className)}>
                                    {freeFireEvent.title}
                                </h3>
                                <p className={cn("text-xs text-red-400 italic mb-2", cinzel.className)}>
                                    "{freeFireEvent.tagline}"
                                </p>

                                <p className="text-sm text-zinc-300 line-clamp-3 mb-4 leading-relaxed font-medium">
                                    {freeFireEvent.desc}
                                </p>

                                <div className="mt-auto space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                                        <div className="col-span-2 flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-red-500/70" />
                                            <span className="font-bold text-red-400">{freeFireEvent.deadline}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-red-500/70" />
                                            4 Players/Squad
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-red-500/70" />
                                            Custom Rooms
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Entry Fee</span>
                                            <span className="text-lg font-bold text-white">₹{freeFireEvent.fee}</span>
                                            <span className="text-[9px] text-zinc-600">₹100 per player</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open('https://drive.google.com/file/d/1y2gyLARxWxo1Jf0dEj3ebqplxQhyOWhF/view?usp=drivesdk', '_blank')}
                                                className="rounded-lg h-9 font-bold text-[10px] uppercase border-red-500/30 text-red-400 hover:bg-red-500/10 px-3"
                                            >
                                                <FileText className="w-3 h-3 mr-1" /> Rulebook
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleFreeFire}
                                                className="rounded-lg h-9 font-bold text-[10px] uppercase bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 px-5"
                                            >
                                                Register Now <ChevronRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Database Events for Multimedia */}
                        {events.map((event) => {
                            const isRegistered = registeredIds.includes(event.id!);
                            return (
                                <div
                                    key={event.id}
                                    onClick={(e) => {
                                        if (!isRegistered) {
                                            e.stopPropagation();
                                            handleRegister();
                                        } else {
                                            router.push(`/events/details/${event.id}`);
                                        }
                                    }}
                                    className={cn(
                                        "group relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-amber-500/50 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col gap-4 cursor-pointer overflow-hidden",
                                        isRegistered && "border-green-500/30 bg-green-900/10"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                    {isRegistered && (
                                        <div className="absolute top-4 right-4 z-20 bg-green-500/20 border border-green-500/50 text-green-300 text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Registered
                                        </div>
                                    )}

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="self-start mb-3">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border",
                                                event.category ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-zinc-400 border-zinc-700 bg-zinc-800"
                                            )}>
                                                {event.category || 'Event'}
                                            </span>
                                        </div>

                                        <h3 className={cn("text-2xl font-black text-white leading-tight mb-2 group-hover:text-amber-400 transition-colors", cinzel.className)}>
                                            {event.title}
                                        </h3>

                                        <p className="text-sm text-zinc-300 line-clamp-3 mb-4 leading-relaxed font-medium">
                                            {event.description}
                                        </p>

                                        <div className="mt-auto space-y-4">
                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-zinc-400 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-amber-500/70" />
                                                    {(event.date && event.time) ? `${event.date} | ${event.time}` : (event.schedule || 'TBA')}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-amber-500/70" />
                                                    {event.minTeamSize === event.maxTeamSize ?
                                                        (event.minTeamSize === 1 ? 'Individual' : `${event.minTeamSize} Members`) :
                                                        `${event.minTeamSize}-${event.maxTeamSize} Members`
                                                    }
                                                </div>
                                                <div className="flex items-center gap-2 col-span-2">
                                                    <MapPin className="w-3.5 h-3.5 text-amber-500/70" />
                                                    {event.venue || 'MVGR College'}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Entry Fee</span>
                                                    <span className="text-lg font-bold text-white">
                                                        {event.entryFeeInr > 0 ? `₹${event.entryFeeInr}` : 'Free'}
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    {event.rulebookUrl && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(event.rulebookUrl, '_blank');
                                                            }}
                                                            className="h-9 px-3 rounded-lg border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] uppercase font-bold tracking-wider"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Rulebook
                                                        </Button>
                                                    )}

                                                    {isRegistered ? (
                                                        <Button size="sm" onClick={() => router.push(`/events/details/${event.id}`)} className="rounded-lg h-9 font-bold text-[10px] uppercase bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 px-4">
                                                            View Pass
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleRegister(); }} className="rounded-lg h-9 font-bold text-[10px] uppercase bg-white text-black hover:bg-zinc-200 border-none shadow-[0_0_20px_rgba(255,255,255,0.1)] px-5">
                                                            Register Now <ChevronRight className="w-3 h-3 ml-1" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><CoinLoader text="Loading Events..." /></div>;

    return (
        <div className={cn("min-h-screen bg-[#050505] text-white p-4 pb-20 selection:bg-red-500/30")}>
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center gap-4 mt-8">
                    <Button variant="ghost" onClick={() => router.push('/')} className="text-neutral-400 hover:text-white pl-0 hover:bg-transparent">
                        <ArrowLeft className="w-6 h-6 mr-2" /> Back to Home
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
                                    onClick={(e) => {
                                        if (!isRegistered) {
                                            e.stopPropagation();
                                            handleRegister();
                                        } else {
                                            router.push(`/events/details/${event.id}`);
                                        }
                                    }}
                                    className={cn(
                                        "group relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-amber-500/50 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col gap-4 cursor-pointer overflow-hidden",
                                        isRegistered && "border-green-500/30 bg-green-900/10"
                                    )}
                                >
                                    {/* Glass Gradient Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                                    {/* Decoration Line */}
                                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                    {/* Registered Badge */}
                                    {isRegistered && (
                                        <div className="absolute top-4 right-4 z-20 bg-green-500/20 border border-green-500/50 text-green-300 text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Registered
                                        </div>
                                    )}

                                    <div className="relative z-10 flex flex-col h-full">
                                        {/* Status Badge */}
                                        <div className="self-start mb-3">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border",
                                                event.category ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-zinc-400 border-zinc-700 bg-zinc-800"
                                            )}>
                                                {event.category || 'Event'}
                                            </span>
                                        </div>

                                        <h3 className={cn("text-2xl font-black text-white leading-tight mb-2 group-hover:text-amber-400 transition-colors", cinzel.className)}>
                                            {event.title}
                                        </h3>

                                        <p className="text-sm text-zinc-300 line-clamp-3 mb-4 leading-relaxed font-medium">
                                            {event.description}
                                        </p>

                                        <div className="mt-auto space-y-4">
                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-zinc-400 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-amber-500/70" />
                                                    {(event.date && event.time) ? `${event.date} | ${event.time}` : (event.schedule || 'TBA')}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-amber-500/70" />
                                                    {event.minTeamSize === event.maxTeamSize ?
                                                        (event.minTeamSize === 1 ? 'Individual' : `${event.minTeamSize} Members`) :
                                                        `${event.minTeamSize}-${event.maxTeamSize} Members`
                                                    }
                                                </div>
                                                <div className="flex items-center gap-2 col-span-2">
                                                    <MapPin className="w-3.5 h-3.5 text-amber-500/70" />
                                                    {event.venue || 'MVGR College'}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Entry Fee</span>
                                                    <span className="text-lg font-bold text-white">
                                                        {event.entryFeeInr > 0 ? `₹${event.entryFeeInr}` : 'Free'}
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    {event.rulebookUrl && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(event.rulebookUrl, '_blank');
                                                            }}
                                                            className="h-9 px-3 rounded-lg border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] uppercase font-bold tracking-wider"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Rulebook
                                                        </Button>
                                                    )}

                                                    {isRegistered ? (
                                                        <Button size="sm" onClick={() => router.push(`/events/details/${event.id}`)} className="rounded-lg h-9 font-bold text-[10px] uppercase bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 px-4">
                                                            View Pass
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleRegister(); }} className="rounded-lg h-9 font-bold text-[10px] uppercase bg-white text-black hover:bg-zinc-200 border-none shadow-[0_0_20px_rgba(255,255,255,0.1)] px-5">
                                                            Register Now <ChevronRight className="w-3 h-3 ml-1" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
                        <p className="text-zinc-500 font-medium mb-4">No events found in {categorySlug} yet.</p>
                        <Button variant="link" className="text-amber-500" onClick={() => router.push('/')}>Browse all categories</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

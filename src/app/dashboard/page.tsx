'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    MessageCircle, // Chat icon replacement (Feedbacks can use MessageSquare)
    CheckCircle,
    Wallet,
    PartyPopper,
    Users,
    MessageSquare,
    Menu,
    ChevronRight,
    Bell,
    FileText,
    LogOut,
    Shield,
    Ticket // Add Ticket
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { getEvents, getUnreadNotificationsCount, getUserEventRegistrations } from '@/lib/db';
import { db } from '@/lib/firebase';
import NotificationsCarousel from '@/components/NotificationsCarousel';
import { CustodialWallet } from '@/components/CustodialWallet';
import { EntryPassCard } from '@/components/dashboard/EntryPassCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Loader2, MapPin, CalendarClock, Trophy } from 'lucide-react';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

import VideoCarousel from '@/components/VideoCarousel';

export default function DashboardPage() {
    const router = useRouter();
    const { userProfile } = useAuth(); // Removed logout unused

    // Dynamic Stats State
    const [notifCount, setNotifCount] = React.useState(0);
    const [upcomingEvents, setUpcomingEvents] = React.useState<any[]>([]);
    const [myEvents, setMyEvents] = React.useState<any[]>([]);
    const [allEvents, setAllEvents] = React.useState<any[]>([]); // Added allEvents state
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchDashboardData = async () => {
            if (userProfile?.uid) {
                try {
                    const notifs = await getUnreadNotificationsCount(userProfile.uid);
                    setNotifCount(notifs);

                    // Fetch Events & Registrations
                    // Fetch ALL events for Explore section (removed semester filter to show all)
                    const events = await getEvents('2024-01');
                    setAllEvents(events); // Save all events for exploration
                    const allRegistrations = await getUserEventRegistrations(userProfile.uid);

                    // Match Registrations to Events
                    // Match Registrations to Events (Deduplicated Source of Truth)
                    const registeredEventIds = new Set(allRegistrations.map((r: any) => r.eventId));
                    const uniqueEvents = events.filter((e: any) => registeredEventIds.has(e.id));

                    setMyEvents(uniqueEvents);

                    // Filter for upcoming generic (non-registered?) or just keep as is
                    const futureEvents = events.filter((e: any) => new Date(e.date) >= new Date()).slice(0, 3);
                    setUpcomingEvents(futureEvents);

                } catch (e) {
                    console.error("Dashboard data fetch failed", e);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [userProfile]);

    // --- SELF-HEARING: Legacy User Sync ---
    React.useEffect(() => {
        const syncLegacyUser = async () => {
            if (userProfile?.uid && userProfile.hasEntryPass === undefined) {
                // Check if they actually have a registration
                // We check the root 'registrations' collection for their ID
                const regDocRef = await import('firebase/firestore').then(mod => mod.doc(db, 'registrations', userProfile.uid));
                const regSnap = await import('firebase/firestore').then(mod => mod.getDoc(regDocRef));

                if (regSnap.exists() && regSnap.data().paymentStatus === 'paid') {
                    console.log("Syncing legacy user: Found valid pass, updating profile...");
                    await import('firebase/firestore').then(mod => mod.updateDoc(mod.doc(db, 'users', userProfile.uid), {
                        hasEntryPass: true,
                        // Sync other fields if needed
                        idCardUrl: regSnap.data().responses?.idCardUrl || userProfile.idCardUrl
                    }));
                    // Force reload or let next refresh handle it
                    window.location.reload();
                }
            }
        };
        syncLegacyUser();
    }, [userProfile]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }

    const categorizedEvents = React.useMemo(() => {
        // Group available events (not registered) by category
        const available = allEvents.filter(e => !myEvents.find(me => me.id === e.id));
        const categories: Record<string, any[]> = {};

        available.forEach(e => {
            const cat = e.category || 'Competitions';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(e);
        });

        return categories;
    }, [allEvents, myEvents]);

    // Role-based Tools
    const tools = [
        {
            title: 'Schedule',
            icon: Calendar,
            bg: 'bg-purple-100',
            path: '/schedule',
            desc: 'Fest Timeline'
        }
    ];

    if (userProfile?.role === 'admin') {
        tools.push({
            title: 'Admin Panel',
            icon: Shield,
            bg: 'bg-blue-100',
            path: '/admin',
            desc: 'Manage Portal'
        });
    }

    return (
        <div className="min-h-screen bg-black pb-24 font-sans text-zinc-100">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center border-2 border-black shadow-sm overflow-hidden" onClick={() => router.push('/')}>
                        <img src="/AFT.png" alt="Aadhrita" className="w-full h-full object-contain p-1" />
                    </div>
                    <span className="font-black text-xl tracking-tighter uppercase italic text-white">AADHRITA</span>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/notifications')}
                        className="relative hover:bg-transparent"
                    >
                        <Bell className="w-6 h-6" strokeWidth={2.5} />
                        {notifCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                        )}
                    </Button>

                    <div onClick={() => router.push('/profile')} className="cursor-pointer hover:scale-105 transition-transform">
                        <Avatar className="w-9 h-9 border-2 border-black shadow-sm">
                            <AvatarFallback className="bg-yellow-400 font-bold text-black text-xs">
                                {userProfile?.fullName?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </header>

            <main className="container max-w-md mx-auto px-4 mt-6 space-y-8">

                {/* 1. Entry Pass (QR Code & Greeting) */}
                <EntryPassCard userProfile={userProfile} events={myEvents} />

                {/* 2. My Registrations (Confirmed Access) - Ported from /my-events */}
                {myEvents.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Confirmed Access
                        </h2>

                        <div className="grid gap-3">
                            {myEvents.map((evt) => (
                                <div
                                    key={evt.id}
                                    onClick={() => router.push(`/events/${evt.id}`)}
                                    className="group relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-4 transition-all hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] active:scale-[0.98] cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-neutral-800 border border-neutral-700 flex flex-col items-center justify-center shadow-lg shrink-0 overflow-hidden relative">
                                            {evt.imagePosterUrl ? (
                                                <img src={evt.imagePosterUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" />
                                            ) : (
                                                <>
                                                    <span className="text-[10px] text-neutral-500 font-bold uppercase">
                                                        {evt.startDate ? new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}
                                                    </span>
                                                    <span className="text-xl font-black text-white">
                                                        {evt.startDate && !isNaN(new Date(evt.startDate).getTime()) ? new Date(evt.startDate).getDate() : '--'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1">
                                                <h3 className="text-white font-bold leading-tight line-clamp-2 pr-2">{evt.title}</h3>
                                                <div className="bg-green-500/10 text-[10px] font-bold text-green-500 px-2 py-0.5 rounded-full border border-green-500/20 shrink-0">
                                                    PAID
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-medium">
                                                <div className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {evt.schedule || 'TBA'}</div>
                                                {evt.venue && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.venue}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />

                {/* 3. Explore Events (Ported from /my-events) */}
                <div className="space-y-6">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-none">Explore</h2>
                            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Discover & Compete</p>
                        </div>
                    </div>

                    {Object.entries(categorizedEvents).map(([category, events]) => (
                        <div key={category} className="space-y-3">
                            <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest pl-1 border-l-2 border-yellow-500">{category}</h3>
                            <div className="grid gap-3">
                                {events.map((evt) => (
                                    <div
                                        key={evt.id}
                                        // Dynamic routing to event details page
                                        onClick={() => router.push(`/events/details/${evt.id}`)}
                                        className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <h4 className="text-white font-bold text-lg group-hover:text-yellow-400 transition-colors">{evt.title}</h4>
                                                <p className="text-xs text-neutral-400 line-clamp-2 max-w-[90%]">{evt.description}</p>
                                            </div>
                                            <div className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg shrink-0">
                                                ₹{evt.entryFeeInr || evt.entryFeeAft || 0}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
                                                <span>
                                                    {evt.maxTeamSize > 1
                                                        ? (evt.minTeamSize === 1 ? "Team / Solo" : `${evt.minTeamSize}-${evt.maxTeamSize} Members`)
                                                        : "Solo"}
                                                </span>
                                                {evt.prizePool && <span className="flex items-center gap-1 text-yellow-500"><Trophy className="w-3 h-3" /> ₹{evt.prizePool}</span>}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {allEvents.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto" />
                            <p className="text-neutral-500 mt-2">Loading events...</p>
                        </div>
                    )}
                </div>

            </main>
        </div>

    );
}

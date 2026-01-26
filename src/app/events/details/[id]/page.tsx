'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, Event } from '@/lib/db';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DynamicForm } from '@/components/events/DynamicForm';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { toast } from 'sonner';
import Image from 'next/image';
import { ArrowLeft, Calendar, MapPin, Users, Coins, Trophy } from 'lucide-react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, googleLogin } = useAuth();
    const eventId = params.id as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Dynamic Form State
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const docRef = doc(db, 'events', eventId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setEvent({ id: snap.id, ...snap.data() } as Event);
                } else {
                    toast.error("Event not found");
                    router.push('/events');
                }
            } catch (err) {
                console.error(err);
                toast.error("Error fetching event");
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId, router]);

    const handleRegister = async () => {
        if (!user || !event) return;

        setRegistering(true);
        try {
            // 1. Prepare Registration Data
            const registrationData = {
                eventId: event.id,
                userId: user.uid,
                paymentStatus: event.entryFeeInr > 0 ? 'pending' : 'completed', // MVP Logic
                status: 'active',
                userSnapshot: {
                    fullName: user.displayName || 'Unknown',
                    email: user.email || 'No Email',
                    // user.photoURL etc.
                },
                responses: formData,
                createdAt: serverTimestamp()
            };

            // 2. Save to Firestore
            await addDoc(collection(db, 'registrations'), registrationData);

            toast.success("Registration Successful!");
            setDialogOpen(false);
            // Optionally redirect to a "My Tickets" page
        } catch (error) {
            console.error(error);
            toast.error("Registration failed. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

    const onEnrollClick = () => {
        if (!user) {
            toast.error("Please Login first");
            googleLogin();
            return;
        }
        setDialogOpen(true);
    };

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><CoinLoader text="Loading Details..." /></div>;
    if (!event) return null;

    return (
        <div className={cn("min-h-screen bg-[#050505] text-white font-sans selection:bg-red-500/30 pb-20")}>
            {/* Nav Back */}
            <div className="absolute top-6 left-6 z-20">
                <Button variant="ghost" className="bg-black/20 backdrop-blur hover:bg-white/10 text-white rounded-full p-2" onClick={() => router.back()}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
            </div>

            {/* Page Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 blur-sm" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="block md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 blur-sm" style={{ backgroundImage: "url('/final.png')" }} />
            </div>

            {/* Poster Hero */}
            <div className="relative w-full h-[50vh] md:h-[60vh] z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] z-10" />
                <Image
                    src={event.imagePosterUrl || '/final%20desktop.png'}
                    alt={event.title}
                    fill
                    className="object-cover opacity-80"
                    priority
                />
            </div>

            {/* Content Container */}
            <div className="relative z-20 max-w-4xl mx-auto px-6 -mt-32">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_60px_rgba(0,0,0,0.5)]">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start mb-8 border-b border-white/10 pb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-500 border border-red-600/30 text-xs font-bold uppercase tracking-wider">
                                    {event.category}
                                </span>
                                {event.entryFeeInr === 0 && (
                                    <span className="px-3 py-1 rounded-full bg-green-600/20 text-green-500 border border-green-600/30 text-xs font-bold uppercase tracking-wider">
                                        Free Entry
                                    </span>
                                )}
                            </div>
                            <h1 className={cn("text-4xl md:text-6xl font-black uppercase leading-none text-white", cinzel.className)}>
                                {event.title}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-neutral-400 text-xs uppercase tracking-widest font-bold">Entry Fee</p>
                                <p className="text-3xl font-black text-[#D4AF37]">
                                    {event.entryFeeInr > 0 ? `₹${event.entryFeeInr}` : 'Free'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-2 gap-12 mb-12">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold uppercase text-white/80 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-red-500" /> About Event
                            </h3>
                            <p className="text-neutral-300 leading-relaxed text-lg">
                                {event.description}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xl font-bold uppercase text-white/80 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-500" /> Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <Users className="w-6 h-6 text-neutral-400" />
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase font-bold">Team Size</p>
                                        <p className="font-bold">{event.minTeamSize} - {event.maxTeamSize} Members</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <Coins className="w-6 h-6 text-[#D4AF37]" />
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase font-bold">Rewards</p>
                                        <p className="font-bold text-[#D4AF37]">{event.entryFeeAft} AFT Coins</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                        {/* Action Button */}
                        <div className="flex justify-center">
                            {/* Default to open if status is missing or explicitly open */}
                            {(!event.registrationStatus || event.registrationStatus === 'open') ? (
                                <Button
                                    onClick={() => router.push(`/events/${event.id}/register`)}
                                    className="h-16 px-12 text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-full shadow-[0_0_40px_rgba(220,38,38,0.4)] transition-all transform hover:scale-105"
                                >
                                    Enroll Now
                                </Button>
                            ) : (
                                <Button
                                    disabled
                                    className="h-16 px-12 text-xl font-bold bg-neutral-800 text-neutral-500 border border-white/10 rounded-full cursor-not-allowed"
                                >
                                    {event.registrationStatus === 'closed' ? 'Registration Closed' : 'Coming Soon'}
                                </Button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

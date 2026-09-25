'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTS_DATA } from '@/lib/constants';
import { RegistrationService } from '@/lib/services/registrationService';
import { EventService } from '@/lib/services/eventService';
import { DynamicRegistrationForm } from '@/components/events/DynamicRegistrationForm';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import { UserRegistration, EventRegistration } from '@/lib/db';
import { CoinLoader } from '@/components/ui/CoinLoader';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function EventRegisterPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // Use 'eventId' as per the folder name [eventId]
    const eventIdParam = params.eventId as string;

    const [event, setEvent] = React.useState<any>(null);
    const [userProfile, setUserProfile] = React.useState<UserRegistration | null>(null);
    const [existingReg, setExistingReg] = React.useState<EventRegistration | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        const init = async () => {
            if (authLoading) return;
            if (!user) {
                router.replace('/login');
                return;
            }

            // 1. Fetch Event Config (Live from Firestore)
            const liveEvent = await EventService.getEventById(eventIdParam);

            if (!liveEvent) {
                // Determine if we should fallback (optional)
                setLoading(false);
                return; // Event not found ui
            }
            setEvent(liveEvent);

            // 2. Fetch User Passport
            const profile = await RegistrationService.getUserProfile(user.uid);
            if (!profile || !profile.completed) {
                router.replace('/register/onboarding');
                return;
            }
            setUserProfile(profile);

            // 3. Check Existing Registration
            const existing = await RegistrationService.checkEventRegistration(user.uid, eventIdParam);
            setExistingReg(existing);

            setLoading(false);
        };

        init();
    }, [user, authLoading, eventIdParam, router]);

    const handleRegistrationSubmit = async (formData: any) => {
        if (!user || !event || !userProfile) return;
        setSubmitting(true);
        try {
            await RegistrationService.registerForEvent(
                user.uid,
                event.id,
                formData,
                userProfile
            );
            toast.success("Registration Successful!");
            // Refresh state to show success screen
            const existing = await RegistrationService.checkEventRegistration(user.uid, event.id);
            setExistingReg(existing);
        } catch (error) {
            console.error(error);
            toast.error("Registration failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
                <CoinLoader size={48} text="Syncing Event Records..." />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">Event Not Found</h1>
                    <p className="text-neutral-500 mt-2">ID: {eventIdParam}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-[#0B0C10] text-white py-12 px-4 relative overflow-hidden")}>
            {/* Background */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
            <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#D4AF37]/10 to-transparent pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">

                {/* Event Header Card */}
                <div className="mb-8 text-center pt-8">
                    <h1 className={cn("text-3xl md:text-5xl font-black uppercase text-white mb-2 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]", cinzel.className)}>
                        {event.title}
                    </h1>
                    <div className="inline-block px-4 py-1 border border-[#D4AF37] rounded-full text-[#D4AF37] text-xs font-bold tracking-widest uppercase mb-4">
                        {event.category}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

                    {existingReg ? (
                        <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className={cn("text-2xl font-bold text-white mb-2", cinzel.className)}>Registration Confirmed</h2>
                            <p className="text-neutral-400 mb-8">You are officially registered for {event.title}.</p>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-sm text-neutral-300">
                                Registration ID: <span className="font-mono text-[#D4AF37]">{existingReg.eventId}_{user!.uid.slice(0, 6)}</span>
                            </div>
                        </div>
                    ) : (
                        <DynamicRegistrationForm
                            config={event.formConfig}
                            userProfile={userProfile!}
                            onSubmit={handleRegistrationSubmit}
                            submitting={submitting}
                        />
                    )}
                </div>

            </div>
        </div>
    );
}

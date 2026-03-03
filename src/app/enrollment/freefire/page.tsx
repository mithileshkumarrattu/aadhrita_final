'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, count, getCountFromServer } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, Trophy, Users, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });

const PHONE_REGEX = /^[6-9]\d{9}$/;
const REGISTRATION_DEADLINE = new Date('2026-03-03T12:00:00+05:30'); // March 3, 2026 12:00 PM IST
const MAX_TEAMS = 144;

interface Player {
    name: string;
    ign: string; // In-Game Name
    college: string;
    contact: string;
}

interface FormData {
    teamName: string;
    leaderName: string;
    leaderContact: string;
    players: [Player, Player, Player, Player];
    rulesAgreed: boolean;
}

const INITIAL_PLAYER: Player = { name: '', ign: '', college: '', contact: '' };

const INITIAL_FORM_DATA: FormData = {
    teamName: '',
    leaderName: '',
    leaderContact: '',
    players: [
        { ...INITIAL_PLAYER },
        { ...INITIAL_PLAYER },
        { ...INITIAL_PLAYER },
        { ...INITIAL_PLAYER }
    ],
    rulesAgreed: false
};

export default function FreeFireEnrollmentPage() {
    const router = useRouter();
    const { user, loading: authLoading, googleLogin } = useAuth();
    const [formData, setFormData] = React.useState<FormData>(INITIAL_FORM_DATA);
    const [loading, setLoading] = React.useState(false);
    const [checkingRegistration, setCheckingRegistration] = React.useState(true);
    const [registeredCount, setRegisteredCount] = React.useState(0);
    const [isDeadlinePassed, setIsDeadlinePassed] = React.useState(false);
    const [existingRegistration, setExistingRegistration] = React.useState<any>(null);
    const [pendingRegistration, setPendingRegistration] = React.useState<any>(null);

    // Check deadline
    React.useEffect(() => {
        setIsDeadlinePassed(new Date() > REGISTRATION_DEADLINE);
    }, []);

    // Check existing registration and count
    React.useEffect(() => {
        const checkRegistration = async () => {
            if (!user) {
                setCheckingRegistration(false);
                return;
            }

            try {
                // Check if user already registered
                const docRef = doc(db, COLLECTIONS.FREEFIRE_TEAMS, user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.paymentStatus === 'success' || data.paymentStatus === 'paid') {
                        // User already registered - store the data
                        setExistingRegistration(data);
                    } else if (data.paymentStatus === 'pending') {
                        // Pending registration - pre-fill form
                        setPendingRegistration(data);
                        setFormData({
                            teamName: data.teamName || '',
                            leaderName: data.leader?.name || '',
                            leaderContact: data.leader?.contact || '',
                            players: data.players || INITIAL_FORM_DATA.players,
                            rulesAgreed: data.rulesAgreed || false
                        });
                        toast.info("We found your previous registration. You can edit and retry payment.");
                    }
                }

                // Get count of successful registrations
                const q = query(
                    collection(db, COLLECTIONS.FREEFIRE_TEAMS),
                    where('paymentStatus', '==', 'success')
                );
                const snapshot = await getCountFromServer(q);
                setRegisteredCount(snapshot.data().count);
            } catch (error) {
                console.error("Error checking registration:", error);
            } finally {
                setCheckingRegistration(false);
            }
        };

        if (user) {
            checkRegistration();
        } else if (!authLoading) {
            // Fetch public count even when not logged in
            const fetchCount = async () => {
                try {
                    const q = query(
                        collection(db, COLLECTIONS.FREEFIRE_TEAMS),
                        where('paymentStatus', '==', 'success')
                    );
                    const snapshot = await getCountFromServer(q);
                    setRegisteredCount(snapshot.data().count);
                } catch (error) {
                    console.error("Error fetching count:", error);
                }
                setCheckingRegistration(false);
            };
            fetchCount();
        }
    }, [user, router, authLoading]);

    const updateFormData = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updatePlayer = (index: number, field: keyof Player, value: string) => {
        setFormData(prev => {
            const newPlayers = [...prev.players] as [Player, Player, Player, Player];
            newPlayers[index] = { ...newPlayers[index], [field]: value };
            return { ...prev, players: newPlayers };
        });
    };

    const validateForm = (): string | null => {
        if (!formData.teamName.trim()) return "Team Name is required";
        if (!formData.leaderName.trim()) return "Team Leader Name is required";
        if (!formData.leaderContact.trim() || !PHONE_REGEX.test(formData.leaderContact)) {
            return "Valid 10-digit Leader Contact Number is required";
        }

        // Validate all 4 players
        for (let i = 0; i < 4; i++) {
            const player = formData.players[i];
            if (!player.name.trim()) return `Player ${i + 1} Name is required`;
            if (!player.ign.trim()) return `Player ${i + 1} In-Game Name (IGN) is required`;
            if (!player.college.trim()) return `Player ${i + 1} College Name is required`;
            if (!player.contact.trim() || !PHONE_REGEX.test(player.contact)) {
                return `Player ${i + 1} must have a valid 10-digit Contact Number`;
            }
        }

        if (!formData.rulesAgreed) {
            return "You must read and agree to the Tournament Rule Book & Guidelines";
        }

        return null;
    };

    const handleSubmit = async () => {
        if (!user) {
            toast.error("Please sign in with Google to continue");
            return;
        }

        // Validate form
        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        // Check deadline
        if (isDeadlinePassed) {
            toast.error("Registration deadline has passed (March 3, 2026 12:00 PM)");
            return;
        }

        // Check registration limit
        if (registeredCount >= MAX_TEAMS) {
            toast.error(`Registration is full! All ${MAX_TEAMS} team slots are taken.`);
            return;
        }

        setLoading(true);

        try {
            // Create order ID with FF- prefix for FreeFire
            const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
            const orderId = `FF-${Date.now()}_${uniqueSuffix}`;

            // Save team data with pending status
            const teamData = {
                teamName: formData.teamName,
                leader: {
                    name: formData.leaderName,
                    contact: formData.leaderContact
                },
                players: formData.players,
                rulesAgreed: formData.rulesAgreed,
                userId: user.uid,
                email: user.email,
                paymentStatus: 'pending' as 'pending' | 'success' | 'failed',
                orderId: orderId,
                totalAmount: 400,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Save to Firestore
            await setDoc(doc(db, COLLECTIONS.FREEFIRE_TEAMS, user.uid), teamData);

            toast.info("Team data saved. Initiating payment...");

            // 15-second timeout — if Paytm is unreachable, show an error instead of infinite spinner
            const paymentAbort = new AbortController();
            const paymentTimeout = setTimeout(() => paymentAbort.abort(), 15000);

            let response: Response;
            try {
                response = await fetch('/api/paytm/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: paymentAbort.signal,
                    body: JSON.stringify({
                        amount: '400',
                        email: user.email,
                        phone: formData.leaderContact,
                        studentName: formData.leaderName,
                        orderId: orderId,
                        userId: user.uid,
                        eventIds: ['freefire'] // Identifier for callback handling
                    })
                });
            } catch (fetchErr: any) {
                if (fetchErr.name === 'AbortError') {
                    throw new Error('Payment gateway is temporarily unreachable. Please check your internet connection and try again.');
                }
                throw fetchErr;
            } finally {
                clearTimeout(paymentTimeout);
            }

            const data = await response.json();

            if (!data.success || !data.txnToken) {
                throw new Error(data.message || "Failed to initiate payment");
            }

            // Redirect to Paytm
            if (data.deepLink) {
                window.location.href = data.deepLink;
                return;
            }

            const baseUrl = "https://securegw.paytm.in";
            const paytmUrl = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${orderId}&txnToken=${data.txnToken}`;

            window.location.href = paytmUrl;
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Registration failed. Please try again.");
            setLoading(false);
        }
    };

    if (authLoading || checkingRegistration) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto" />
                    <p className="text-neutral-500 text-sm animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    // Show deadline/full message if applicable
    const slotsRemaining = MAX_TEAMS - registeredCount;
    const isFullyBooked = registeredCount >= MAX_TEAMS;

    if (isDeadlinePassed || isFullyBooked) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-4 flex items-center justify-center">
                <div className="max-w-2xl w-full bg-gradient-to-br from-neutral-900 to-black p-8 rounded-3xl border border-red-500/30 shadow-2xl text-center space-y-6">
                    <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                        <Shield className="w-10 h-10 text-red-500" />
                    </div>
                    <div>
                        <h2 className={cn("text-3xl font-black text-white mb-3", cinzel.className)}>
                            {isDeadlinePassed ? "Registration Closed" : "Fully Booked!"}
                        </h2>
                        <p className="text-neutral-400 text-lg">
                            {isDeadlinePassed
                                ? "The registration deadline has passed (March 3, 2026 - 12:00 PM)."
                                : `All ${MAX_TEAMS} team slots have been filled. Thank you for your interest!`}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/events/multimedia')}
                        className="bg-white text-black hover:bg-neutral-200 font-bold h-12 px-8 rounded-xl"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Events
                    </Button>
                </div>
            </div>
        );
    }

    // Inline Auth Screen (if not logged in)
    if (!user) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-4 flex items-center justify-center">
                {/* Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
                </div>

                <div className="relative z-10 max-w-md w-full bg-gradient-to-br from-neutral-900 to-black p-8 rounded-3xl border border-red-500/30 shadow-2xl space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
                        </div>
                        <h1 className={cn("text-2xl md:text-3xl font-black text-white mb-1", cinzel.className)}>
                            ASCENSION CUP 2026
                        </h1>
                        <p className={cn("text-sm md:text-base text-red-400 italic mb-3", cinzel.className)}>
                            "Rise. Dominate. Conquer."
                        </p>
                        <p className="text-sm md:text-base text-neutral-400 mb-4">
                            MVGR Esports Championship • ₹400 per team
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs md:text-sm text-neutral-500">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-red-500" />
                                <span>{slotsRemaining} / {MAX_TEAMS} Slots Open</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <p className="text-sm text-neutral-300 text-center">
                                Sign in with your Google account to register your squad
                            </p>
                        </div>

                        <Button
                            onClick={() => googleLogin()}
                            disabled={loading}
                            className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-neutral-200 rounded-xl flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="pt-4 border-t border-white/10 text-center">
                        <button
                            onClick={() => router.push('/events/multimedia')}
                            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Events
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show existing registration if user already registered
    if (existingRegistration) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-4 pb-20">
                {/* Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-8 mt-8">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/events/multimedia')}
                            className="text-neutral-400 hover:text-white pl-0"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" /> Back
                        </Button>
                    </div>

                    <div className="text-center">
                        <h1 className={cn("text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-green-700 mb-2", cinzel.className)}>
                            ALREADY REGISTERED!
                        </h1>
                        <p className="text-neutral-400">Your team has been successfully enrolled</p>
                    </div>

                    {/* Registration Details */}
                    <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-green-500/30 shadow-lg space-y-6">
                        {/* Success Badge */}
                        <div className="flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                            <Shield className="w-6 h-6 text-green-400" />
                            <span className="text-green-300 font-bold">Payment Confirmed - Registration Complete</span>
                        </div>

                        {/* Team Info */}
                        <div className="space-y-4">
                            <h2 className={cn("text-2xl font-bold text-white flex items-center gap-2", cinzel.className)}>
                                <Trophy className="w-6 h-6 text-red-500" /> Team Information
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4 bg-black/20 p-6 rounded-2xl">
                                <div>
                                    <p className="text-sm text-neutral-500">Team Name</p>
                                    <p className="text-lg font-bold text-white">{existingRegistration.teamName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Team Leader</p>
                                    <p className="text-lg font-bold text-white">{existingRegistration.leader.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Contact Number</p>
                                    <p className="text-lg font-bold text-white">{existingRegistration.leader.contact}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Registration Fee</p>
                                    <p className="text-lg font-bold text-green-400">₹{existingRegistration.totalAmount} (Paid)</p>
                                </div>
                            </div>
                        </div>

                        {/* Players List */}
                        <div className="space-y-4">
                            <h2 className={cn("text-2xl font-bold text-white flex items-center gap-2", cinzel.className)}>
                                <Users className="w-6 h-6 text-red-500" /> Squad Members
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {existingRegistration.players?.map((player: any, index: number) => (
                                    <div key={index} className="bg-black/20 p-4 rounded-xl border border-white/10">
                                        <p className="text-xs text-neutral-500 uppercase mb-2">Player {index + 1}</p>
                                        <p className="font-bold text-white">{player.name}</p>
                                        <p className="text-sm text-red-400">IGN: {player.ign}</p>
                                        <p className="text-xs text-neutral-500">{player.college}</p>
                                        <p className="text-xs text-neutral-500">{player.contact}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Transaction Details */}
                        {existingRegistration.transactionId && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                                <p className="text-sm text-neutral-500 mb-1">Transaction ID</p>
                                <p className="text-sm font-mono text-neutral-300">{existingRegistration.transactionId}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4 border-t border-white/10">
                            <Button
                                onClick={() => router.push('/dashboard')}
                                className="flex-1 bg-white text-black hover:bg-neutral-200 font-bold h-12 rounded-xl"
                            >
                                Go to Dashboard
                            </Button>
                            <Button
                                onClick={() => router.push('/events/multimedia')}
                                variant="outline"
                                className="flex-1 border-white/20 text-white hover:bg-white/10 font-bold h-12 rounded-xl"
                            >
                                Browse Events
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Registration Form
    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 pb-20">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-6 md:space-y-8 mt-4 md:mt-8">
                {/* Header */}
                <div className="flex items-start">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/events/multimedia')}
                        className="text-neutral-400 hover:text-white pl-0"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Back
                    </Button>
                </div>

                <div className="text-center space-y-2">
                    <h1 className={cn("text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700", cinzel.className)}>
                        ASCENSION CUP 2026
                    </h1>
                    <p className={cn("text-base md:text-lg text-red-400 italic", cinzel.className)}>
                        "Rise. Dominate. Conquer."
                    </p>
                    <p className="text-sm md:text-base text-neutral-400">Team Registration • ₹400 (₹100 × 4 Players)</p>
                    {pendingRegistration && (
                        <div className="mt-3 bg-amber-900/20 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-sm">
                            <p className="font-bold">✏️ Editing Previous Registration</p>
                            <p className="text-xs text-amber-400/80 mt-1">Your previous payment was cancelled. You can edit and retry.</p>
                        </div>
                    )}
                </div>

                {/* Form */}
                <div className="bg-white/5 backdrop-blur-md p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl border border-white/10 shadow-lg space-y-6 md:space-y-8">
                    {/* Team Info */}
                    <div className="space-y-4">
                        <h2 className={cn("text-xl font-bold text-white flex items-center gap-2", cinzel.className)}>
                            <Trophy className="w-5 h-5 text-red-500" /> Team Information
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <Label className="text-neutral-300 font-semibold text-sm">
                                    Team Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    className="bg-black/40 text-white border-white/10 mt-1"
                                    placeholder="Enter your squad name"
                                    value={formData.teamName}
                                    onChange={(e) => updateFormData('teamName', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-neutral-300 font-semibold text-sm">
                                    Team Leader Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    className="bg-black/40 text-white border-white/10 mt-1"
                                    placeholder="Leader's full name"
                                    value={formData.leaderName}
                                    onChange={(e) => updateFormData('leaderName', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-neutral-300 font-semibold text-sm">
                                    Leader Contact Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="tel"
                                    className="bg-black/40 text-white border-white/10 mt-1"
                                    placeholder="10-digit mobile number"
                                    value={formData.leaderContact}
                                    onChange={(e) => updateFormData('leaderContact', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Players */}
                    <div className="space-y-6">
                        <h2 className={cn("text-xl font-bold text-white flex items-center gap-2", cinzel.className)}>
                            <Users className="w-5 h-5 text-red-500" /> Squad Members (4 Players)
                        </h2>
                        {formData.players.map((player, index) => (
                            <div key={index} className="bg-black/20 p-6 rounded-2xl border border-white/10 space-y-4">
                                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                    Player {index + 1}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-neutral-300 text-sm">Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="bg-black/40 text-white border-white/10 mt-1"
                                            placeholder="Full name"
                                            value={player.name}
                                            onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-neutral-300 text-sm">In-Game Name (IGN) <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="bg-black/40 text-white border-white/10 mt-1"
                                            placeholder="FreeFire IGN"
                                            value={player.ign}
                                            onChange={(e) => updatePlayer(index, 'ign', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-neutral-300 text-sm">College Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="bg-black/40 text-white border-white/10 mt-1"
                                            placeholder="e.g., MVGR College"
                                            value={player.college}
                                            onChange={(e) => updatePlayer(index, 'college', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-neutral-300 text-sm">Contact Number <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="tel"
                                            className="bg-black/40 text-white border-white/10 mt-1"
                                            placeholder="10-digit mobile"
                                            value={player.contact}
                                            onChange={(e) => updatePlayer(index, 'contact', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Rules Agreement */}
                    <div className="bg-red-900/10 p-4 md:p-6 rounded-2xl border border-red-500/30 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                            <h2 className={cn("text-lg md:text-xl font-bold text-white", cinzel.className)}>
                                Tournament Rules
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('https://drive.google.com/file/d/1y2gyLARxWxo1Jf0dEj3ebqplxQhyOWhF/view?usp=drivesdk', '_blank')}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs md:text-sm"
                            >
                                <FileText className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                                View Rule Book
                            </Button>
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="rules"
                                checked={formData.rulesAgreed}
                                onCheckedChange={(checked) => updateFormData('rulesAgreed', checked === true)}
                                className="mt-1 border-white/20 data-[state=checked]:bg-red-600"
                            />
                            <Label htmlFor="rules" className="text-xs md:text-sm text-neutral-300 cursor-pointer leading-relaxed">
                                I confirm that I have read and agree to the complete{' '}
                                <span className="text-red-400 font-bold">Tournament Rule Book & Guidelines</span>.
                                I understand that matches will be conducted in Custom Rooms (Squad - Battle Royale mode),
                                and only <span className="font-bold">144 teams</span> will be accepted on a first-come,
                                first-served basis.
                            </Label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-neutral-500">Total Registration Fee</p>
                                <p className={cn("text-3xl font-black text-white", cinzel.className)}>₹400</p>
                                <p className="text-xs text-neutral-600">₹100 per player • Paid by Team Leader</p>
                            </div>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold h-14 px-8 rounded-xl shadow-lg shadow-red-900/30"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Proceed to Payment
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* ⚠️ Industry-standard payment caution */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                            <span className="text-amber-400 text-lg shrink-0">⚠️</span>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-amber-300">Important — Please Read Before Paying</p>
                                <ul className="text-xs text-amber-400/80 space-y-1 leading-relaxed list-disc list-inside">
                                    <li>Do <b>NOT</b> close the payment app until you see the success screen.</li>
                                    <li>Do <b>NOT</b> press the back button during payment.</li>
                                    <li>Do <b>NOT</b> refresh this page while payment is in progress.</li>
                                    <li>Wait for the page to redirect automatically after completion.</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-xs text-neutral-500 text-center">
                            Secure payment via Paytm • Registration closes on March 3, 2026 at 12:00 PM
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

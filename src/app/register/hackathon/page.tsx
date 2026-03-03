'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, HackathonTeam, COLLECTIONS } from '@/lib/db';
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle, CheckCircle2, Trophy, ArrowRight, Lock, Search, BedDouble, Calendar, Users, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// Config
const HACKATHON_FEE = 600; // Per person
const ACCOMMODATION_FEE = 500; // Per day per person

const STEPS = [
    { id: 1, title: 'Verify Team' },
    { id: 2, title: 'Confirm Details' },
    { id: 3, title: 'Accommodation' },
    { id: 4, title: 'Payment' }
];

// Accommodation type
interface AccommodationChoice {
    mar11: boolean;
    mar13: boolean;
}

export default function HackathonFinalRegisterPage() {
    const router = useRouter();
    const { user, userProfile, googleLogin, loading: authLoading } = useAuth(); // Destructure loading

    const [loading, setLoading] = React.useState(true);
    const [pageState, setPageState] = React.useState<'input' | 'process' | 'restricted' | 'paid'>('input');
    const [teamIdInput, setTeamIdInput] = React.useState('');
    const [teamData, setTeamData] = React.useState<HackathonTeam | null>(null);
    const [currentStep, setCurrentStep] = React.useState(1);
    const [paymentLoading, setPaymentLoading] = React.useState(false);

    // Accommodation state: index 0 = leader, 1+ = members
    const [accommodation, setAccommodation] = React.useState<Record<number, AccommodationChoice>>({});

    // Edited contact details: index 0 = leader, 1+ = members
    const [editedContacts, setEditedContacts] = React.useState<Record<number, { email: string; phone: string }>>({});

    // Initial Auth Check
    React.useEffect(() => {
        if (!authLoading) setLoading(false);
    }, [authLoading]);

    // Initialize state when team data loads
    const initData = (data: HackathonTeam) => {
        // Accommodation
        const accom: Record<number, AccommodationChoice> = {};
        accom[0] = data.leader.accommodation || { mar11: false, mar13: false };
        data.members?.forEach((m, i) => {
            accom[i + 1] = m.accommodation || { mar11: false, mar13: false };
        });
        setAccommodation(accom);

        // Contacts
        const contacts: Record<number, { email: string; phone: string }> = {};
        contacts[0] = { email: data.leader.email, phone: data.leader.phone };
        data.members?.forEach((m, i) => {
            contacts[i + 1] = { email: m.email, phone: m.phone };
        });
        setEditedContacts(contacts);
    };

    const updateContact = (idx: number, field: 'email' | 'phone', value: string) => {
        setEditedContacts(prev => ({
            ...prev,
            [idx]: { ...prev[idx], [field]: value }
        }));
    };

    const toggleAccommodation = (memberIdx: number, day: 'mar11' | 'mar13') => {
        setAccommodation(prev => ({
            ...prev,
            [memberIdx]: {
                ...prev[memberIdx],
                [day]: !prev[memberIdx]?.[day]
            }
        }));
    };

    // Pricing calculation
    const pricing = React.useMemo(() => {
        if (!teamData) return { hackathon: 0, accommodation: 0, total: 0, accomDays: 0 };
        const hackathon = teamData.teamSize * HACKATHON_FEE;
        let accomDays = 0;
        Object.values(accommodation).forEach(a => {
            if (a.mar11) accomDays++;
            if (a.mar13) accomDays++;
        });
        const accomTotal = accomDays * ACCOMMODATION_FEE;
        return { hackathon, accommodation: accomTotal, total: hackathon + accomTotal, accomDays };
    }, [teamData, accommodation]);

    // Fetch Team by ID
    const handleFetchTeam = async () => {
        if (!teamIdInput.trim()) {
            toast.error("Please enter a Team ID");
            return;
        }
        setLoading(true);
        try {
            const ident = teamIdInput.trim();
            const identUpper = ident.toUpperCase();

            // Helper to search a specific collection
            const searchCollection = async (colName: string): Promise<any | null> => {
                // 1. Try Document ID exact match
                const docSnap = await getDoc(doc(db, colName, ident));
                if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };

                // 2. Try 'teamId' field exactly
                let q = query(collection(db, colName), where('teamId', '==', ident));
                let snap = await getDocs(q);
                if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

                // 3. Try 'teamId' field uppercase
                q = query(collection(db, colName), where('teamId', '==', identUpper));
                snap = await getDocs(q);
                if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

                // 4. Try 'teamName' field exactly
                q = query(collection(db, colName), where('teamName', '==', ident));
                snap = await getDocs(q);
                if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

                // 5. Try 'teamName' field uppercase (if stored in uppercase)
                q = query(collection(db, colName), where('teamName', '==', identUpper));
                snap = await getDocs(q);
                if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

                return null;
            };

            // 1. Try Standard Collection
            let foundData = await searchCollection('hackathon_teams');
            if (foundData) {
                validateAndSetTeam(foundData as HackathonTeam);
                return;
            }

            // 2. Try Legacy Collection (reg_hackathon)
            foundData = await searchCollection('reg_hackathon');
            if (foundData) {
                const lData = foundData;
                // Map Legacy Data to HackathonTeam Interface
                const mappedData: HackathonTeam & { isLegacy: boolean; _collection: string } = {
                    id: lData.id,
                    teamName: lData.teamName || 'Unknown Team',
                    teamSize: lData.teamSize || 0,
                    collegeName: lData.collegeName || '',
                    collegeCity: lData.collegeCity || '',
                    collegeState: lData.collegeState || '',
                    leader: lData.leader,
                    members: lData.members || [],
                    pptUrl: lData.pptUrl || '',
                    pptTitle: lData.pptTitle || '',
                    agreedToRules: true,
                    declaredOriginality: true,
                    previousParticipation: false,
                    communicationChannel: lData.communicationChannel || '',
                    emergencyContact: lData.emergencyContact || '',
                    referralSource: lData.referralSource || '',
                    status: lData.status || 'pending',
                    paymentStatus: lData.paymentStatus || 'pending',
                    createdAt: lData.createdAt,
                    passTokens: lData.passTokens || [],
                    totalAmount: lData.totalAmount || 0,
                    hackathonTotal: lData.hackathonTotal || 0,
                    accommodationTotal: lData.accommodationTotal || 0,
                    isLegacy: true,
                    _collection: 'reg_hackathon'
                };
                validateAndSetTeam(mappedData);
                return;
            }

            toast.error("Team not found. Please check the ID or Team Name.");
            setLoading(false);
        } catch (error) {
            console.error("Fetch Error", error);
            toast.error("Failed to fetch team");
            setLoading(false);
        }
    };

    const validateAndSetTeam = (data: HackathonTeam & { isLegacy?: boolean; _collection?: string }) => {
        setTeamData(data);
        initData(data);
        if (data.paymentStatus === 'success' || data.paymentStatus === 'paid') {
            setPageState('paid');
        } else if (data.status !== 'approved') {
            setPageState('restricted');
        } else {
            setPageState('process');
            setCurrentStep(2);
        }
        setLoading(false);
    };

    // Detect localhost for test mode
    const [isLocalhost, setIsLocalhost] = React.useState(false);
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        }
    }, []);

    // Save accommodation to Firestore and initiate payment
    const handlePayment = async () => {
        if (!teamData || !user) return;
        setPaymentLoading(true);

        try {
            // 1. Build accommodation & updated contact data
            const leaderUpdate = {
                ...teamData.leader,
                email: editedContacts[0]?.email || teamData.leader.email,
                phone: editedContacts[0]?.phone || teamData.leader.phone,
                accommodation: accommodation[0] || { mar11: false, mar13: false }
            };

            const updatedMembers = teamData.members.map((m, i) => ({
                ...m,
                email: editedContacts[i + 1]?.email || m.email,
                phone: editedContacts[i + 1]?.phone || m.phone,
                accommodation: accommodation[i + 1] || { mar11: false, mar13: false }
            }));

            // 2. Save accommodation + contacts + amounts to correct doc BEFORE payment
            const collectionName = (teamData as any)._collection || 'hackathon_teams';
            await updateDoc(doc(db, collectionName, teamData.id!), {
                leader: leaderUpdate,
                members: updatedMembers,
                totalAmount: pricing.total,
                hackathonTotal: pricing.hackathon,
                accommodationTotal: pricing.accommodation
            });

            // 3. Initiate Paytm
            const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
            const orderId = `HACK_${Date.now()}_${uniqueSuffix}`;
            const amount = pricing.total.toString();

            // 15-second timeout — if Paytm is unreachable, show an error instead of infinite spinner
            const paymentAbort = new AbortController();
            const paymentTimeout = setTimeout(() => paymentAbort.abort(), 15000);

            let response: Response;
            try {
                response = await fetch('/api/paytm/initiate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Tell the server which Firestore collection this team lives in
                        'x-team-collection': (teamData as any)._collection || 'hackathon_teams'
                    },
                    signal: paymentAbort.signal,
                    body: JSON.stringify({
                        amount,
                        email: user.email,
                        phone: userProfile?.mobileNumber || teamData.leader.phone,
                        studentName: userProfile?.fullName || teamData.leader.name,
                        orderId,
                        userId: user.uid,
                        eventIds: ['HACKATHON'],
                        teamId: teamData.id // Pass teamId for reliable callback lookup
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
            if (!data.success) throw new Error(data.message || "Gateway Error");

            // Redirect to Paytm
            if (data.deepLink) {
                window.location.href = data.deepLink;
                return;
            }

            const baseUrl = "https://securegw.paytm.in";
            const paytmUrl = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${orderId}&txnToken=${data.txnToken}`;
            window.location.href = paytmUrl;

        } catch (error: any) {
            toast.error(error.message);
            setPaymentLoading(false);
        }
    };

    // TEST MODE: Simulate payment without Paytm
    const handleTestPayment = async () => {
        if (!teamData || !user) return;
        setPaymentLoading(true);

        try {
            // 1. Save accommodation & updated contact first (same as real flow)
            const leaderUpdate = {
                ...teamData.leader,
                email: editedContacts[0]?.email || teamData.leader.email,
                phone: editedContacts[0]?.phone || teamData.leader.phone,
                accommodation: accommodation[0] || { mar11: false, mar13: false }
            };

            const updatedMembers = teamData.members.map((m, i) => ({
                ...m,
                email: editedContacts[i + 1]?.email || m.email,
                phone: editedContacts[i + 1]?.phone || m.phone,
                accommodation: accommodation[i + 1] || { mar11: false, mar13: false }
            }));

            // 2. Save accommodation + contacts + amounts to correct doc BEFORE payment
            const collectionName = (teamData as any)._collection || 'hackathon_teams';
            await updateDoc(doc(db, collectionName, teamData.id!), {
                leader: leaderUpdate,
                members: updatedMembers,
                totalAmount: pricing.total,
                hackathonTotal: pricing.hackathon,
                accommodationTotal: pricing.accommodation
            });

            // 2. Call test callback API
            const response = await fetch('/api/paytm/test-callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId: teamData.id,
                    userId: user.uid,
                    email: user.email,
                    amount: pricing.total.toString(),
                    studentName: userProfile?.fullName || teamData.leader.name,
                    phone: userProfile?.mobileNumber || teamData.leader.phone
                })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Test payment failed");

            toast.success("Test payment successful!");
            router.push(`/hackathon/my-team?teamId=${teamData.id}`);

        } catch (error: any) {
            toast.error(error.message);
            setPaymentLoading(false);
        }
    };

    // All members list (leader + members) for accommodation step
    const allMembers = React.useMemo(() => {
        if (!teamData) return [];
        const list = [{ name: teamData.leader.name, regNo: teamData.leader.regNo, isLeader: true }];
        teamData.members?.forEach(m => list.push({ name: m.name, regNo: m.regNo, isLeader: false }));
        return list;
    }, [teamData]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
    }

    // --- State: Not Logged In (Inline Login) ---
    if (!user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-yellow-500/20">
                        <Lock className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Login Required</h2>
                        <p className="text-neutral-400">
                            Please sign in with your Google account to access the Hackathon Registration.
                        </p>
                    </div>

                    <Button
                        onClick={() => googleLogin('/register/hackathon')}
                        className="w-full h-12 text-lg font-bold bg-white text-black hover:bg-neutral-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                    </Button>
                    <p className="text-xs text-neutral-600">
                        You will be redirected back here after login.
                    </p>
                </div>
            </div>
        );
    }

    // --- State: Already Paid ---
    if (pageState === 'paid') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-green-900/20 to-neutral-900 border border-green-500/30 p-8 rounded-2xl max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Seat Confirmed!</h2>
                    <p className="text-neutral-300">
                        Team <b>{teamData?.teamName}</b> is successfully registered for the Grand Finale.
                    </p>

                    {/* Show pass links if available */}
                    {teamData?.passTokens && teamData.passTokens.length > 0 && (
                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left space-y-3 mt-4">
                            <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider">🎫 Team Passes</p>
                            {teamData.passTokens.map((pt, i) => (
                                <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                    <div>
                                        <p className="text-sm font-medium text-white">{pt.name} {pt.isLeader && <span className="text-yellow-500 text-xs">(Lead)</span>}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-neutral-400 hover:text-white"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/pass/${pt.token}`);
                                                toast.success(`Link copied for ${pt.name}`);
                                            }}
                                        ><Copy className="w-3 h-3 mr-1" /> Copy</Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-neutral-400 hover:text-white"
                                            onClick={() => window.open(`/pass/${pt.token}`, '_blank')}
                                        ><ExternalLink className="w-3 h-3" /></Button>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs mt-2"
                                onClick={() => {
                                    const links = teamData.passTokens!.map(pt =>
                                        `${pt.name}${pt.isLeader ? ' (Lead)' : ''}: ${window.location.origin}/pass/${pt.token}`
                                    ).join('\n');
                                    navigator.clipboard.writeText(`🎫 Aadhrita Hackathon Passes - Team ${teamData.teamName}\n\n${links}`);
                                    toast.success("All links copied! Share via WhatsApp");
                                }}
                            >📋 Copy All Links (for WhatsApp)</Button>
                        </div>
                    )}

                    <Button onClick={() => router.push(`/hackathon/my-team?teamId=${teamData?.id}`)} className="w-full mt-4 bg-green-600 hover:bg-green-700 font-bold">View Hackathon Dashboard</Button>
                </div>
            </div>
        );
    }

    // --- State: Restricted / Not Approved ---
    if (pageState === 'restricted') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Lock className="w-8 h-8 text-neutral-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
                    <p className="text-neutral-400">
                        The team <b>ID: {teamIdInput}</b> is currently <b>{teamData?.status || 'under review'}</b>.
                    </p>
                    <p className="text-xs text-neutral-500">Only Approved teams can proceed to payment.</p>
                    <div className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => setPageState('input')} className="flex-1">Try Different ID</Button>
                        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="flex-1">Dashboard</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <RoyalFormLayout
            title="Grand Finale Registration"
            subtitle="Secure your spot for the ultimate showdown"
            showStep={true} currentStep={currentStep} totalSteps={4} steps={STEPS.map(s => s.title)}
        >
            {/* Step 1: Input Team ID */}
            {currentStep === 1 && (
                <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 py-10">
                    <div className="text-center space-y-2 mb-8">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto border border-yellow-500/20 mb-4">
                            <Search className="w-6 h-6 text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Locate Your Team</h3>
                        <p className="text-neutral-400 text-sm">Enter the Team ID provided in your approval email or dashboard.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="uppercase text-xs font-bold text-neutral-500">Team ID</Label>
                            <div className="flex gap-2">
                                <Input
                                    className="bg-black border-white/10 text-white h-12 font-mono"
                                    placeholder="e.g. 7Af2..."
                                    value={teamIdInput}
                                    onChange={(e) => setTeamIdInput(e.target.value)}
                                />
                                <Button
                                    onClick={handleFetchTeam}
                                    className="h-12 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                >
                                    Verify
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-neutral-600 text-center">
                            Note: Only the Team Leader or authorized member should complete this step.
                        </p>
                    </div>
                </div>
            )}

            {/* Step 2: Member Review (Read Only) */}
            {currentStep === 2 && teamData && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl flex items-start gap-4">
                        <Trophy className="w-8 h-8 text-yellow-500 shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-yellow-500 text-lg">Team Verified!</h3>
                            <p className="text-yellow-200/80 text-sm mt-1">
                                <b>{teamData.teamName}</b> is approved for the Grand Finale. Review details below.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Unified Member Card Logic */}
                        {[teamData.leader, ...teamData.members].map((member: any, i: number) => (
                            <div key={i} className="bg-neutral-900/80 p-6 rounded-xl border border-white/10 space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 h-1 w-full bg-yellow-500/20 group-hover:bg-yellow-500/50 transition-colors" />
                                <h3 className="font-bold text-white flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        {i === 0 ? <Trophy className="w-4 h-4 text-yellow-500" /> : <Users className="w-4 h-4 text-neutral-400" />}
                                        {i === 0 ? 'Team Leader' : `Member ${i + 1}`}
                                    </span>
                                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-neutral-500 uppercase tracking-widest">
                                        {member.regNo}
                                    </span>
                                </h3>

                                <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Full Name</Label>
                                        <div className="font-bold text-white text-lg">{member.name}</div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Roll Number</Label>
                                        <div className="font-mono text-sm text-yellow-500/70">{member.regNo}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                                            <Lock className="w-2.5 h-2.5" /> Mobile Number
                                        </Label>
                                        <Input
                                            value={editedContacts[i]?.phone || ''}
                                            onChange={(e) => updateContact(i, 'phone', e.target.value)}
                                            className="bg-black/50 border-white/5 text-white h-10 focus:border-yellow-500/50 transition-all font-mono"
                                            placeholder="10-digit mobile"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                                            <Lock className="w-2.5 h-2.5" /> Email Address
                                        </Label>
                                        <Input
                                            value={editedContacts[i]?.email || ''}
                                            onChange={(e) => updateContact(i, 'email', e.target.value)}
                                            className="bg-black/50 border-white/5 text-white h-10 focus:border-yellow-500/50 transition-all"
                                            placeholder="Email for pass delivery"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <Button variant="ghost" className="text-neutral-400 hover:text-white" onClick={() => { setCurrentStep(1); setPageState('input'); setTeamData(null); }}>Back</Button>
                        <Button onClick={() => setCurrentStep(3)} className="flex-1 h-12 text-lg font-bold bg-yellow-500 text-black hover:bg-yellow-600">
                            Next: Accommodation <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Accommodation Selection */}
            {currentStep === 3 && teamData && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-xl flex items-start gap-4">
                        <BedDouble className="w-8 h-8 text-blue-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-blue-400 text-lg">Accommodation</h3>
                            <p className="text-blue-200/80 text-sm mt-1">
                                Select which team members need accommodation. <b>₹500 per day</b> per person.
                                12th March is the 24hr hackathon day — no accommodation needed.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {allMembers.map((member, idx) => (
                            <div key={idx} className="bg-neutral-900/80 rounded-2xl border border-white/10 p-6 transition-all hover:border-blue-500/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 font-black text-xl border border-blue-500/20">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-black text-white text-lg tracking-tight uppercase">{member.name}</p>
                                            <p className="text-xs text-neutral-500 font-mono tracking-widest">{member.regNo} {member.isLeader && <span className="text-yellow-500 font-black ml-2">TEAM LEADER</span>}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 shrink-0">
                                        {[
                                            { id: 'mar11', label: '11th March' },
                                            { id: 'mar13', label: '13th March' }
                                        ].map((day) => (
                                            <label
                                                key={day.id}
                                                className={`
                                                    flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all
                                                    ${accommodation[idx]?.[day.id as keyof AccommodationChoice]
                                                        ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)] shadow-blue-900/40 translate-y-[-2px]'
                                                        : 'bg-black/40 border-white/10 hover:border-white/30 text-neutral-500'}
                                                `}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    toggleAccommodation(idx, day.id as 'mar11' | 'mar13');
                                                }}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${accommodation[idx]?.[day.id as keyof AccommodationChoice] ? 'text-blue-100' : 'text-neutral-500'}`}>
                                                    {day.label}
                                                </span>
                                                <span className={`text-xs font-bold mt-1 ${accommodation[idx]?.[day.id as keyof AccommodationChoice] ? 'text-white' : 'text-neutral-400'}`}>
                                                    ₹500
                                                </span>
                                                <div className="mt-2">
                                                    <Checkbox
                                                        checked={accommodation[idx]?.[day.id as keyof AccommodationChoice] || false}
                                                        className={`border-2 transition-all ${accommodation[idx]?.[day.id as keyof AccommodationChoice] ? 'bg-white border-white text-blue-600' : 'border-neutral-700'}`}
                                                    />
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Accommodation Summary */}
                    {pricing.accomDays > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-400">
                                    {pricing.accomDays} accommodation day{pricing.accomDays > 1 ? 's' : ''} selected
                                </p>
                                <p className="text-xs text-amber-500/80 mt-0.5">
                                    Additional ₹{pricing.accommodation} will be added to your total
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <Button variant="ghost" className="text-neutral-400 hover:text-white" onClick={() => setCurrentStep(2)}>Back</Button>
                        <Button onClick={() => setCurrentStep(4)} className="flex-1 h-12 text-lg font-bold bg-yellow-500 text-black hover:bg-yellow-600">
                            Proceed to Payment <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Payment */}
            {currentStep === 4 && teamData && (
                <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />

                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-white">Grand Finale Pass</h2>
                            <p className="text-sm text-neutral-400">Complete payment to secure your team&apos;s spot</p>
                        </div>

                        {/* Hackathon Fee */}
                        <div className="flex justify-between items-center py-4 border-b border-dashed border-white/10">
                            <div className="text-left">
                                <div className="font-medium text-neutral-300">Hackathon Registration</div>
                                <div className="text-xs text-neutral-500">{teamData.teamSize} members × ₹{HACKATHON_FEE}</div>
                            </div>
                            <div className="font-bold text-lg text-white">₹{pricing.hackathon}</div>
                        </div>

                        {/* Accommodation Fee */}
                        {pricing.accommodation > 0 && (
                            <div className="flex justify-between items-center py-4 border-b border-dashed border-white/10">
                                <div className="text-left">
                                    <div className="font-medium text-neutral-300">Accommodation</div>
                                    <div className="text-xs text-neutral-500">{pricing.accomDays} day{pricing.accomDays > 1 ? 's' : ''} × ₹{ACCOMMODATION_FEE}</div>
                                </div>
                                <div className="font-bold text-lg text-amber-400">₹{pricing.accommodation}</div>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-end pt-4 mb-6">
                            <div className="text-left text-sm font-bold text-neutral-500 uppercase tracking-widest">Total Payable</div>
                            <div className="text-4xl font-black text-white">₹{pricing.total}</div>
                        </div>

                        {/* ⚠️ Industry-standard payment caution — displayed just before Pay Now */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
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

                        <Button
                            onClick={handlePayment}
                            disabled={paymentLoading}
                            className="w-full h-14 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-900/20 transition-all active:scale-[0.98]"
                        >
                            {paymentLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Pay Now (UPI Only)"}
                        </Button>

                        {/* TEST MODE: Only visible on localhost */}
                        {isLocalhost && (
                            <Button
                                onClick={handleTestPayment}
                                disabled={paymentLoading}
                                className="w-full h-12 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-black mt-2 border-2 border-dashed border-orange-700"
                            >
                                {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "⚡ TEST: Simulate Payment (Dev Only)"}
                            </Button>
                        )}

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-6 flex gap-3 text-left">
                            <Lock className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-400/80 leading-snug">
                                Payment is secured by Paytm. We strictly accept UPI payments to ensure fast & verified transactions.
                            </p>
                        </div>
                    </div>

                    <Button variant="ghost" className="w-full text-neutral-400 hover:text-white" onClick={() => setCurrentStep(3)}>Back to Accommodation</Button>
                </div>
            )}

            <div className="h-24"></div>
        </RoyalFormLayout>
    );
}

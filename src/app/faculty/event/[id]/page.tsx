'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { db, COLLECTIONS, getEvents, Event } from '@/lib/db';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot, documentId } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Loader2, LogOut, Search, Users, Coins, IdCard, FileText, CheckCircle2,
    Shield, ExternalLink, Download, Trophy, Wallet, Eye, User
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Types ---
interface EventStatConfig {
    qualifiedTeams?: number;
    showStatus?: boolean;
}

// Helper to chunk arrays for Firestore 'in' queries
const chunkArray = (array: string[], size: number) => {
    const chunked = [];
    let index = 0;
    while (index < array.length) {
        chunked.push(array.slice(index, size + index));
        index += size;
    }
    return chunked;
};

export default function FacultyEventPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [loading, setLoading] = React.useState(true);
    const [eventTitle, setEventTitle] = React.useState('');
    const [registrations, setRegistrations] = React.useState<any[]>([]); // All enriched regs
    const [filteredRegs, setFilteredRegs] = React.useState<any[]>([]); // Filtered list
    const [search, setSearch] = React.useState('');
    const [stats, setStats] = React.useState({ total: 0, paid: 0, distinct: 0 });

    const [walletBalance, setWalletBalance] = React.useState<string>('0');
    const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
    const [rewardAmount, setRewardAmount] = React.useState('10');
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    // Filter State
    const [showPending, setShowPending] = React.useState(false);

    // --- Data Enrichment ---
    const enrichRegistrations = async (rawRegs: any[]) => {
        if (rawRegs.length === 0) return [];

        // 1. Fetch Team Data
        const teamIds = Array.from(new Set(rawRegs.map(r => r.teamId).filter(Boolean)));
        const teamDataMap: Record<string, any> = {};

        if (teamIds.length > 0) {
            const teamChunks = chunkArray(teamIds, 10);
            await Promise.all(teamChunks.map(async (chunk) => {
                const teamsQuery = query(collection(db, 'teams'), where('teamId', 'in', chunk));
                const teamSnaps = await getDocs(teamsQuery);
                teamSnaps.forEach(doc => {
                    const data = doc.data();
                    teamDataMap[data.teamId] = data;
                });
            }));
        }

        // 2. Fetch User Data
        const userIds = new Set(rawRegs.map(r => r.userId).filter(Boolean));
        // Add team members to user Ids
        Object.values(teamDataMap).forEach((team: any) => {
            if (team.memberIds && Array.isArray(team.memberIds)) {
                team.memberIds.forEach((uid: string) => userIds.add(uid));
            }
        });

        const allUserIds = Array.from(userIds);
        const userProfilesMap: Record<string, any> = {};

        if (allUserIds.length > 0) {
            const userChunks = chunkArray(allUserIds, 10);
            await Promise.all(userChunks.map(async (chunk) => {
                const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const userSnaps = await getDocs(usersQuery);
                userSnaps.forEach(doc => {
                    userProfilesMap[doc.id] = doc.data();
                });
            }));
        }

        // 3. Merge
        return rawRegs.map(reg => {
            const userProfile = userProfilesMap[reg.userId] || {};
            const teamDetails = reg.teamId ? teamDataMap[reg.teamId] : null;

            let enrichedMembers: any[] = [];
            if (teamDetails && teamDetails.members) {
                // Critical Fix: Only map members who actually established a SUCCESSFUL registration for THIS team
                enrichedMembers = teamDetails.members
                    .filter((m: any) => rawRegs.some(r => r.userId === m.userId && r.teamId === teamDetails.teamId))
                    .map((m: any) => {
                        const p = m.userId ? userProfilesMap[m.userId] : null;
                        return { ...m, profile: p };
                    });
            }

            return {
                ...reg,
                fullProfile: userProfile,
                teamDetails: teamDetails ? { ...teamDetails, members: enrichedMembers } : null,
                display: {
                    name: userProfile.fullName || reg.userSnapshot?.fullName || 'Unknown',
                    regNo: (userProfile.regNo || userProfile.registrationNumber || reg.userSnapshot?.regNo || 'N/A').replace('GOOGLE_USER', 'N/A'),
                    email: userProfile.email || reg.userSnapshot?.email || 'N/A',
                    phone: userProfile.mobileNumber || reg.userSnapshot?.phone || 'N/A',
                    college: userProfile.collegeName || reg.userSnapshot?.collegeName || 'N/A',
                    branch: userProfile.branch || 'N/A', // Assuming profile uses 'branch'
                    year: userProfile.yearOfStudy || 'N/A',
                    idCard: userProfile.idCardUrl || null,
                    gender: userProfile.gender || 'N/A'
                }
            };
        });
    };

    const fetchWalletBalance = async (sid: string) => {
        try {
            const res = await fetch(`/api/wallet/balance?userId=${sid}&collectionName=staff_credentials`);
            const data = await res.json();
            if (data.exists) {
                setWalletBalance(parseFloat(data.balance).toFixed(2));
                setWalletAddress(data.address);
            }
        } catch (error) {
            console.error("Failed to fetch wallet balance", error);
        }
    };

    // --- Auth & Init ---
    React.useEffect(() => {
        const checkAuthAndInit = async () => {
            const session = getStaffSession();
            if (!session || session.role !== 'coordinator') {
                router.replace('/faculty'); // Redirect to login
                return;
            }
            if (session.assignedEventId && session.assignedEventId !== eventId) {
                toast.error("Unauthorized access to this event.");
                router.replace(`/faculty/event/${session.assignedEventId}`);
                return;
            }

            try {
                const allEvents = await getEvents();
                const event = allEvents.find(e => e.id === eventId);
                setEventTitle(event ? event.title : "Event ID: " + eventId);
                await fetchWalletBalance(session.id);
            } catch (error) {
                console.error("Init Error", error);
            }
        };

        checkAuthAndInit();

        // Real-time Listener for Registrations
        const regsRef = collection(db, COLLECTIONS.EVENTS, eventId, 'registrations');
        const unsubscribe = onSnapshot(regsRef, async (snapshot) => {
            try {
                let rawRegs = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as any))
                    .filter(r => r.paymentStatus === 'success');

                if (rawRegs.length === 0) {
                    setRegistrations([]);
                    setFilteredRegs([]);
                    setLoading(false);
                    return;
                }

                // Deduplicate by userId because a webhook bug marked aborted drafts as 'success' historically
                const uniqueRegs = new Map<string, any>();
                rawRegs.forEach(reg => {
                    const existing = uniqueRegs.get(reg.userId);
                    if (!existing) {
                        uniqueRegs.set(reg.userId, reg);
                    } else {
                        // Prefer the registration that actually has team metadata if multiple exist
                        if (!existing.teamId && reg.teamId) {
                            uniqueRegs.set(reg.userId, reg);
                        } else if (!existing.responses?.teamName && reg.responses?.teamName) {
                            uniqueRegs.set(reg.userId, reg);
                        }
                    }
                });
                rawRegs = Array.from(uniqueRegs.values());

                const enriched = await enrichRegistrations(rawRegs);
                // Sort by recent
                enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setRegistrations(enriched);
                setFilteredRegs(enriched);

                const paidCount = enriched.filter(r => r.paymentStatus === 'success').length;
                const distinctUsers = new Set(enriched.map(r => r.userId)).size;
                setStats({
                    total: enriched.length,
                    paid: paidCount,
                    distinct: distinctUsers
                });

                setLoading(false);
            } catch (error) {
                console.error("Realtime Update Error:", error);
                toast.error("Realtime sync failed, refresh page.");
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [eventId, router]);

    // Filtering
    React.useEffect(() => {
        let filtered = registrations;

        // 1. Payment Filter (Default: Paid only)
        // Since we already filtered for valid regs in onSnapshot, this just toggles 'paid' vs 'all valid'
        // But the user asked for ONLY paid/verified in the dashboard.
        // So 'showPending' might change meaning to "Show Legacy Approved" or just be removed if we only want success.

        // Actually, let's keep it simple: We only load Valid.
        // If showPending is true (which defaults to false), maybe we show failed attempts?
        // But user said "students are showing up who cancelled payment... they shouldnt appear".
        // So we strictly filtered them out above.

        // 2. Search Filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            filtered = filtered.filter(r =>
                r.display.name.toLowerCase().includes(lowerSearch) ||
                r.display.regNo.toLowerCase().includes(lowerSearch) ||
                r.display.phone.includes(lowerSearch) ||
                r.display.college.toLowerCase().includes(lowerSearch) ||
                r.teamDetails?.teamName?.toLowerCase().includes(lowerSearch)
            );
        }
        setFilteredRegs(filtered);
    }, [search, registrations]);

    const handleExport = () => {
        if (filteredRegs.length === 0) {
            toast.error("No data to export");
            return;
        }

        const data = filteredRegs.map(r => ({
            "Registration ID": r.id,
            "Full Name": r.display.name,
            "Registration Number": r.display.regNo,
            "College Name": r.display.college,
            "Branch": r.display.branch,
            "Year of Study": r.display.year,
            "Mobile Number": r.display.phone,
            "Email": r.display.email,
            "Gender": r.display.gender,
            "Payment Status": r.paymentStatus,
            "Role": r.role || 'Individual',
            "Team ID": r.teamId || '-',
            "Team Name": r.teamDetails?.teamName || r.responses?.teamName || '-',
            "PPT URL": r.teamDetails?.pptUrl || r.responses?.pptUrl || '-',
            "Team Members": r.teamDetails?.members?.map((m: any) => `${m.name} (${m.regNo})`).join(', ') || '-',
            "ID Card URL": r.display.idCard || 'Not Uploaded',
            "Created At": r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : new Date().toLocaleDateString()
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Registrations");
        XLSX.writeFile(wb, `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_Detailed_Report.xlsx`);
        toast.success("Detailed report exported successfully");
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/faculty');
    };

    const displayList = React.useMemo(() => {
        let list = registrations.filter(r => r.paymentStatus === 'success');

        // Remove duplicate teams if a user accidentally paid twice for the same team
        const seenTeams = new Set();
        // Fallback for legacy teams without 'teamId' but sharing a 'responses.teamName'
        const legacyTeamMap: Record<string, any[]> = {};

        list = list.filter(r => {
            if (r.teamId) {
                if (seenTeams.has(r.teamId)) return false;
                seenTeams.add(r.teamId);
                return true;
            }
            // If they have a teamName but no teamId, group them virtually
            if (r.responses?.teamName) {
                const tName = r.responses.teamName.trim().toLowerCase();
                if (!legacyTeamMap[tName]) legacyTeamMap[tName] = [];
                legacyTeamMap[tName].push(r);
                return false; // Hide from main list, will be re-injected as a grouped entity
            }
            return true;
        });

        // Re-inject legacy grouped teams
        Object.entries(legacyTeamMap).forEach(([tName, members]) => {
            // Create a virtual team leader from the first member
            const leader = members.find(m => m.role === 'Leader') || members[0];
            const virtualTeamReg = {
                ...leader,
                id: leader.id || `virtual_${tName}`,
                teamId: `virtual_${tName}`,
                teamDetails: {
                    teamName: leader.responses?.teamName || tName,
                    leaderId: leader.userId,
                    members: members.map(m => ({
                        userId: m.userId,
                        name: m.display.name,
                        regNo: m.display.regNo,
                        profile: m.fullProfile,
                        regId: m.id // Keep their actual distinct registration document ID
                    }))
                }
            };
            list.push(virtualTeamReg);
        });

        if (search) {
            const lowerSearch = search.toLowerCase();
            list = list.filter(r =>
                r.display?.name?.toLowerCase().includes(lowerSearch) ||
                r.display?.regNo?.toLowerCase().includes(lowerSearch) ||
                r.display?.phone?.includes(lowerSearch) ||
                r.display?.college?.toLowerCase().includes(lowerSearch) ||
                r.teamDetails?.teamName?.toLowerCase().includes(lowerSearch)
            );
        }

        // Sort to ensure consistent rendering
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        return list;
    }, [registrations, search]);

    const handleIndividualTransfer = async (
        regDocId: string,
        userId: string,
        walletAddress: string | undefined,
        name: string,
        isTeamMember: boolean
    ) => {
        if (!confirm(`Mark ${name} as PRESENT and send ${rewardAmount} AFT?`)) return;
        const session = getStaffSession();
        if (!session?.id) return;

        if (!walletAddress) {
            toast.error("User has no wallet address.");
            return;
        }

        setActionLoading(userId);
        const toastId = toast.loading(`Sending ${rewardAmount} AFT to ${name}...`);

        try {
            const res = await fetch('/api/wallet/transfer', {
                method: 'POST',
                body: JSON.stringify({ userId: session.id, toAddress: walletAddress, amount: Number(rewardAmount) })
            });
            const data = await res.json();

            if (res.ok) {
                const regRef = doc(db, COLLECTIONS.EVENTS, eventId, 'registrations', regDocId);

                if (isTeamMember) {
                    await updateDoc(regRef, {
                        [`attendance.${userId}`]: true
                    });
                } else {
                    await updateDoc(regRef, {
                        rewardStatus: 'paid',
                        rewardAmount: Number(rewardAmount),
                        rewardTxHash: data.txHash,
                        rewardedAt: new Date(),
                        attendance: true
                    });
                }

                toast.success(`Sent ${rewardAmount} AFT!`, { id: toastId });
                fetchWalletBalance(session.id);
            } else {
                toast.error(`Failed: ${data.error}`, { id: toastId });
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Error", { id: toastId });
        } finally {
            setActionLoading(null);
        }
    };

    // Paid List
    const paidList = registrations.filter(r => r.paymentStatus === 'success');

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none truncate max-w-[200px] md:max-w-md">{eventTitle}</h1>
                            <p className="text-xs text-neutral-500 font-mono mt-1">FACULTY DASHBOARD</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono text-neutral-400">REAL-TIME</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-white hover:bg-red-500/20">
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* Top Row: Stats & Wallet */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* 1. Stats Overview */}
                    <Card className="bg-zinc-900/50 border-white/10 p-6 md:col-span-2">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Event Overview
                                </h2>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Track registrations and verified participants in real-time.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                <div className="text-xs text-zinc-500 font-bold uppercase mb-1">Total Individuals</div>
                                <div className="text-3xl font-black text-white">{displayList.length}</div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                <div className="text-xs text-zinc-500 font-bold uppercase mb-1">Paid / Verified Teams & Solos</div>
                                <div className="text-3xl font-black text-green-500">{paidList.length}</div>
                            </div>
                        </div>
                    </Card>

                    {/* 2. Coordinator Wallet */}
                    <Card className="md:col-span-1 bg-zinc-900/50 border-zinc-800 p-6 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                        <div className="flex flex-col gap-4 relative z-10">
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Coordinator Wallet</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-yellow-500" />
                                        <span className="text-2xl font-mono font-bold text-white tracking-tight">
                                            {walletBalance} <span className="text-sm text-zinc-600 font-sans">AFT</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {walletAddress && (
                                <div className="bg-black rounded-lg p-3 border border-zinc-800 flex items-center justify-between group">
                                    <span className="text-xs font-mono text-zinc-400 truncate pr-2">
                                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(walletAddress);
                                            toast.success("Address Copied!");
                                        }}
                                        className="h-6 w-6 p-0 text-zinc-600 hover:text-white"
                                    >
                                        <div className="w-3 h-3"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg></div>
                                    </Button>
                                </div>
                            )}

                            <div className="mt-2 pt-4 border-t border-white/10">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Reward Per User</label>
                                <div className="relative">
                                    <Input
                                        value={rewardAmount}
                                        onChange={(e) => setRewardAmount(e.target.value)}
                                        className="h-8 bg-zinc-900 border-zinc-800 text-white font-bold pr-10 focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all font-mono"
                                    />
                                    <span className="absolute right-3 top-2 text-xs text-zinc-500 font-bold">AFT</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Main Data Tabs */}
                <Tabs defaultValue="enrolled" className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <TabsList className="bg-zinc-900 border border-white/10 p-1 h-auto w-full md:w-auto flex-wrap justify-start">
                            <TabsTrigger value="enrolled" className="px-6 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-bold text-neutral-400">
                                {displayList.some(r => r.teamDetails || r.responses?.teamName) ? 'Teams / Submissions' : 'Participants'} <span className="ml-2 bg-neutral-800 px-2 py-0.5 rounded-full text-xs text-white">{displayList.length}</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <Input
                                    placeholder="Search Participants..."
                                    className="bg-zinc-900/50 border-zinc-800 pl-10 h-10 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <Button onClick={handleExport} variant="outline" className="border-white/10 hover:bg-white/5 gap-2 text-green-400 border-green-900/30 bg-green-900/10 h-10">
                                <Download className="w-4 h-4" /> CSV
                            </Button>
                        </div>
                    </div>

                    {/* Content: Participant List (Teams & Solos) */}
                    <TabsContent value="enrolled" className="space-y-4">
                        {displayList.length === 0 ? (
                            <div className="text-center py-20 text-neutral-500 border border-white/5 rounded-xl bg-white/5">No participants found.</div>
                        ) : (
                            displayList.map((reg: any) => {
                                if (reg.teamId && reg.teamDetails) {
                                    // TEAM CARD
                                    return (
                                        <Card key={reg.id} className="bg-zinc-900 border-white/5 p-4 md:p-6 hover:border-white/10 transition-colors group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider">
                                                        <Users className="w-4 h-4" /> {reg.teamDetails.teamName}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <div className="bg-black/30 border border-white/5 px-2 py-1 rounded text-zinc-400 font-mono">
                                                        Txn: {reg.orderId || reg.paymentId || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {reg.teamDetails.members.map((m: any) => {
                                                    const isAttended = reg.attendance?.[m.userId] === true;
                                                    return (
                                                        <div key={m.userId} className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-3 relative">
                                                            {m.userId === reg.teamDetails.leaderId && (
                                                                <div className="absolute top-0 right-0 bg-yellow-500/10 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg border-l border-b border-yellow-500/20 uppercase">
                                                                    Leader
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h4 className="font-bold text-white text-sm line-clamp-1">{m.name}</h4>
                                                                <div className="text-xs text-zinc-500 font-mono mt-0.5">{m.regNo}</div>
                                                            </div>

                                                            <div className="flex items-center gap-2 mt-1">
                                                                {(m.profile?.idCardUrl || reg.display.idCard) && (
                                                                    <a href={m.profile?.idCardUrl || reg.display.idCard} target="_blank" className="flex items-center gap-1 text-[9px] font-bold uppercase text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded transition-colors w-fit border border-blue-500/20">
                                                                        <IdCard className="w-3 h-3" /> ID
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {isAttended ? (
                                                                <div className="bg-green-500/10 border border-green-500/30 text-green-400 h-8 w-full rounded-md font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 mt-auto">
                                                                    <CheckCircle2 className="w-3 h-3" /> PRESENT
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleIndividualTransfer(m.regId || reg.id, m.userId, m.profile?.walletAddress, m.name, true)}
                                                                    disabled={actionLoading === m.userId || !m.profile?.walletAddress}
                                                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-8 text-[10px] shadow-lg shadow-green-900/20 mt-auto"
                                                                >
                                                                    {actionLoading === m.userId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Coins className="w-3 h-3 mr-1" />}
                                                                    {m.profile?.walletAddress ? `Present (${rewardAmount} AFT)` : 'No Wallet'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    );
                                } else {
                                    // SOLO CARD
                                    const isAttended = reg.rewardStatus === 'paid' || reg.attendance === true;
                                    return (
                                        <Card key={reg.id} className="bg-zinc-900 border-white/5 p-4 md:p-6 hover:border-white/10 transition-colors group flex flex-col md:flex-row gap-6 items-center">
                                            {/* Personal Identity */}
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className="flex items-center gap-2 bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                                                        <User className="w-3 h-3" /> Solo
                                                    </div>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-1">{reg.display.name}</h3>
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 w-full">
                                                    <div>
                                                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Reg No</div>
                                                        <div className="text-sm font-mono text-zinc-300 bg-black/30 px-2 py-0.5 rounded w-fit">{reg.display.regNo}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">College</div>
                                                        <div className="text-sm text-zinc-400 truncate">{reg.display.college}</div>
                                                    </div>
                                                    <div className="col-span-2 lg:col-span-1">
                                                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Phone</div>
                                                        <div className="text-sm font-mono text-zinc-400">{reg.display.phone}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 lg:mt-0">
                                                        {reg.display.idCard && (
                                                            <a href={reg.display.idCard} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors w-fit h-fit border border-blue-500/20">
                                                                <IdCard className="w-3 h-3" /> ID
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Column */}
                                            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                                                {isAttended ? (
                                                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 h-10 w-full rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        PAID & PRESENT
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            onClick={() => handleIndividualTransfer(reg.id, reg.userId, reg.fullProfile?.walletAddress, reg.display.name, false)}
                                                            disabled={actionLoading === reg.userId || !reg.fullProfile?.walletAddress}
                                                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-10 shadow-lg shadow-green-900/20 text-xs"
                                                        >
                                                            {actionLoading === reg.userId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
                                                            Mark Present ({rewardAmount} AFT)
                                                        </Button>
                                                        {!reg.fullProfile?.walletAddress && (
                                                            <p className="text-[10px] text-red-500 text-center font-bold">No Wallet Found</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                }
                            })
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

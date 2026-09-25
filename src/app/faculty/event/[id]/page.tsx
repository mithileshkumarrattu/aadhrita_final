'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { db, COLLECTIONS, getEvents, Event } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot, documentId } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Shield,
    Users,
    User,
    Search,
    Download,
    LogOut,
    CheckCircle2,
    Coins,
    Wallet,
    IdCard,
    ExternalLink
} from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
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
    const [registrations, setRegistrations] = React.useState<any[]>([]); // All enriched regs
    const [filteredRegs, setFilteredRegs] = React.useState<any[]>([]); // Filtered list
    const [currentEvent, setCurrentEvent] = React.useState<any | null>(null);
    const [eventTitle, setEventTitle] = React.useState("Loading...");
    const [search, setSearch] = React.useState('');
    const [stats, setStats] = React.useState({ total: 0, paid: 0, distinct: 0 });

    const [allowanceBalance, setAllowanceBalance] = React.useState<string>('0');
    const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
    const [convenerAddress, setConvenerAddress] = React.useState<string | null>(null);
    const [extraRewardAmounts, setExtraRewardAmounts] = React.useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);
    const [eventCustomFields, setEventCustomFields] = React.useState<any[]>([]);

    // Filter State
    const [showPending, setShowPending] = React.useState(false);

    // Global Settings
    const [rewardEnabled, setRewardEnabled] = React.useState(false);

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
            // ALSO check 'members' array of objects if it exists
            if (team.members && Array.isArray(team.members)) {
                team.members.forEach((m: any) => {
                    if (m.userId) userIds.add(m.userId);
                });
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
                // Return all members of the team. If the team is being rendered, it means at least one person paid.
                enrichedMembers = teamDetails.members
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

    const fetchAllowanceBalance = async (sid: string, cId: string) => {
        try {
            const res = await fetch(`/api/wallet/allowance?ownerId=${cId}&spenderId=${sid}`);
            const data = await res.json();
            if (data.success) {
                setAllowanceBalance(parseFloat(data.allowance).toFixed(2));
                setWalletAddress(data.spender);
                setConvenerAddress(data.owner);
            }
        } catch (error) {
            console.error("Failed to fetch allowance balance", error);
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
                const allEvents = await getEvents(undefined, undefined, true);
                const event = allEvents.find(e => e.id === eventId);
                setCurrentEvent(event || null);
                setEventTitle(event ? event.title : "Event ID: " + eventId);

                const convQuery = await getDocs(query(collection(db, 'staff_credentials'), where('role', '==', 'convener')));
                let cId = '';
                if (!convQuery.empty) {
                    cId = convQuery.docs[0].id;
                }

                if (cId) {
                    await fetchAllowanceBalance(session.id, cId);
                }

                if (event && event.formConfig?.customFields) {
                    setEventCustomFields(event.formConfig.customFields);
                }

                // Fetch Global Settings for Reward Toggle
                const systemRes = await fetch('/api/admin/system');
                if (systemRes.ok) {
                    const systemData = await systemRes.json();
                    if (systemData.success && systemData.settings) {
                        setRewardEnabled(systemData.settings.rewardEnabled === true);
                    }
                }
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
                    .filter(r => r.paymentStatus === 'success' || r.paymentStatus === 'paid');

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

                const distinctUsers = new Set(enriched.map(r => r.userId)).size;

                // For accurate stat counting, we need to apply the same grouping logic we use for displayList
                const seenTeamsForStats = new Set();
                const legacyTeamMapForStats: Record<string, any[]> = {};
                let paidGroupsOrSolosCount = 0;

                enriched.filter(r => r.paymentStatus === 'success' || r.paymentStatus === 'paid').forEach(r => {
                    if (r.teamId) {
                        const tId = String(r.teamId).trim();
                        if (!seenTeamsForStats.has(tId)) {
                            seenTeamsForStats.add(tId);
                            paidGroupsOrSolosCount++;
                        }
                    } else if (r.responses?.teamName) {
                        const tName = String(r.responses.teamName).trim().toLowerCase();
                        if (!legacyTeamMapForStats[tName]) {
                            legacyTeamMapForStats[tName] = [];
                            paidGroupsOrSolosCount++;
                        }
                        legacyTeamMapForStats[tName].push(r);
                    } else {
                        // Solo
                        paidGroupsOrSolosCount++;
                    }
                });

                setStats({
                    total: rawRegs.length, // Raw total registrations
                    paid: paidGroupsOrSolosCount, // This correctly reflects distinct entities
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
            "Role": currentEvent?.maxTeamSize === 1 ? 'Individual' : (r.role || 'Individual'),
            "Team ID": currentEvent?.maxTeamSize === 1 ? '-' : (r.teamId || '-'),
            "Team Name": currentEvent?.maxTeamSize === 1 ? '-' : (r.teamDetails?.teamName || r.responses?.teamName || '-'),
            "PPT URL": r.teamDetails?.pptUrl || r.responses?.pptUrl || '-',
            "Team Members": r.teamDetails?.members?.map((m: any) => `${m.name} (${m.regNo})`).join(', ') || '-',
            "ID Card URL": r.display.idCard || 'Not Uploaded',
            "Created At": r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : new Date().toLocaleDateString()
        }));

        // Flatten custom responses into columns
        const excelData = data.map((item, idx) => {
            const reg = filteredRegs[idx];
            const custom: any = {};
            eventCustomFields.forEach(f => {
                custom[f.label] = reg.responses?.[f.id] || '-';
            });
            return { ...item, ...custom };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
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
        const isSoloEvent = currentEvent?.maxTeamSize === 1;

        if (isSoloEvent) {
            // Simple search for solo events
            if (search) {
                const lowerSearch = search.toLowerCase();
                list = list.filter(r =>
                    r.display?.name?.toLowerCase().includes(lowerSearch) ||
                    r.display?.regNo?.toLowerCase().includes(lowerSearch) ||
                    r.display?.phone?.includes(lowerSearch) ||
                    r.display?.college?.toLowerCase().includes(lowerSearch)
                );
            }
            return list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        }

        // --- ROBUST GROUPING FOR TEAMS ---
        const teamGroups = new Map<string, any[]>(); // Key: Normalized TeamID or TeamName
        const solos: any[] = [];

        list.forEach(reg => {
            const tId = reg.teamId ? String(reg.teamId).trim().toUpperCase() : null;
            const tName = reg.responses?.teamName ? String(reg.responses.teamName).trim().toUpperCase() : null;
            const groupKey = tId || tName;

            if (groupKey) {
                if (!teamGroups.has(groupKey)) teamGroups.set(groupKey, []);
                teamGroups.get(groupKey)?.push(reg);
            } else {
                solos.push(reg);
            }
        });

        const groupedList: any[] = [...solos];

        teamGroups.forEach((members, groupKey) => {
            // Find a leader or just pick the first one as primary
            const primaryReg = members.find(m => m.role === 'Leader') || members[0];
            
            // Merge official team members if they exist in DB but didn't come from regs list (rare but possible)
            const officialMembers = primaryReg.teamDetails?.members || [];
            const mergedMembersMap = new Map();
            
            // Add official members first
            officialMembers.forEach((m: any) => {
                mergedMembersMap.set(m.userId, {
                    userId: m.userId,
                    name: m.name,
                    regNo: m.regNo,
                    profile: m.profile,
                    isFromReg: false
                });
            });

            // Override/Add from actual paid registrations (the source of truth for payment)
            members.forEach(m => {
                mergedMembersMap.set(m.userId, {
                    userId: m.userId,
                    name: m.display.name,
                    regNo: m.display.regNo,
                    profile: m.fullProfile,
                    isFromReg: true,
                    regId: m.id, // CRITICAL: This is the registration doc ID for rewarding
                    attendance: m.attendance,
                    rewards: m.rewards
                });
            });

            const mergedMembers = Array.from(mergedMembersMap.values());

            groupedList.push({
                ...primaryReg,
                teamId: primaryReg.teamId || `group_${groupKey}`,
                teamDetails: {
                    ...(primaryReg.teamDetails || {}),
                    teamName: primaryReg.teamDetails?.teamName || primaryReg.responses?.teamName || groupKey,
                    leaderId: primaryReg.teamDetails?.leaderId || primaryReg.userId,
                    members: mergedMembers
                }
            });
        });

        let finalFiltered = groupedList;
        if (search) {
            const lowerSearch = search.toLowerCase();
            finalFiltered = finalFiltered.filter(r =>
                r.display?.name?.toLowerCase().includes(lowerSearch) ||
                r.display?.regNo?.toLowerCase().includes(lowerSearch) ||
                r.display?.phone?.includes(lowerSearch) ||
                r.display?.college?.toLowerCase().includes(lowerSearch) ||
                r.teamDetails?.teamName?.toLowerCase().includes(lowerSearch) ||
                r.teamDetails?.members?.some((m: any) => 
                    m.name?.toLowerCase().includes(lowerSearch) || 
                    m.regNo?.toLowerCase().includes(lowerSearch)
                )
            );
        }

        return finalFiltered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }, [registrations, search, currentEvent]);

    const handleIndividualTransfer = async (
        regDocId: string,
        userId: string,
        walletAddress: string | undefined,
        name: string,
        isTeamMember: boolean,
        customAmount?: number
    ) => {
        const amt = customAmount || 10;
        if (!confirm(`Send ${amt} AFT to ${name}?`)) return;
        const session = getStaffSession();
        if (!session?.id) return;

        if (!walletAddress || !convenerAddress) {
            toast.error("Missing wallet or Convener configuration.");
            return;
        }

        setActionLoading(userId + (customAmount ? '_extra' : ''));
        const toastId = toast.loading(`Sending ${amt} AFT to ${name}...`);

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/wallet/transferFrom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromAddress: convenerAddress,
                    toAddress: walletAddress,
                    amount: amt
                })
            });
            const data = await res.json();

            if (res.ok) {
                const regRef = doc(db, COLLECTIONS.EVENTS, eventId, 'registrations', regDocId);
                const currentReg = registrations.find(r => r.id === regDocId);
                
                const updates: any = {};
                
                // Unify Attendance: Always use the map structure. 
                // Handle legacy boolean case by overwriting with a new map.
                if (typeof currentReg?.attendance === 'boolean') {
                    updates['attendance'] = { [userId]: true };
                } else {
                    updates[`attendance.${userId}`] = true;
                }

                // Unify Rewards: Always use the map structure.
                // Handle legacy array structure by migrating it to the mapped user's rewards.
                const currentRewards = currentReg?.rewards || {};
                const rewardItem = { amount: amt, txHash: data.txHash, date: new Date() };

                if (Array.isArray(currentRewards)) {
                    updates['rewards'] = { [userId]: [...currentRewards, rewardItem] };
                } else {
                    const existingUserRewards = currentRewards[userId] || [];
                    updates[`rewards.${userId}`] = [...existingUserRewards, rewardItem];
                }

                // Legacy Field Fallbacks for UI synchronization
                if (!isTeamMember) {
                    updates['rewardStatus'] = 'paid';
                    updates['rewardAmount'] = (Number(currentReg?.rewardAmount || 0) + amt);
                    updates['rewardTxHash'] = data.txHash;
                    updates['rewardedAt'] = new Date();
                }

                await updateDoc(regRef, updates);

                toast.success(`Sent ${amt} AFT!`, { id: toastId });
                setAllowanceBalance(prev => (Number(prev) - amt).toFixed(2));
                if (customAmount) {
                    setExtraRewardAmounts(prev => ({ ...prev, [userId]: '' }));
                }
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

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><CoinLoader size={64} text="Syncing Participant Roster..." /></div>;

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

                {/* Top Row: Wallet */}
                <div className="grid grid-cols-1 gap-6">
                    {/* 2. Coordinator Wallet */}
                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                        <div className="flex flex-col gap-4 relative z-10">
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Delegated Budget</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-yellow-500" />
                                        <span className="text-2xl font-mono font-bold text-white tracking-tight">
                                            {allowanceBalance} <span className="text-sm text-zinc-600 font-sans">AFT</span>
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
                                const isSoloEvent = currentEvent?.maxTeamSize === 1;
                                if (!isSoloEvent && reg.teamId && reg.teamDetails) {
                                    // TEAM CARD
                                    return (
                                        <Card key={reg.id} className="bg-zinc-900 border-white/5 p-4 md:p-6 hover:border-white/10 transition-colors group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider">
                                                        <Users className="w-4 h-4" /> {reg.teamDetails.teamName}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {reg.teamDetails.members.map((m: any) => {
                                                    const isAttended = (m.attendance?.[m.userId] === true) || (reg.attendance?.[m.userId] === true) || (m.userId === reg.userId && reg.attendance === true);
                                                    return (
                                                        <div key={m.userId} className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-3 relative">
                                                            {m.userId === reg.teamDetails.leaderId && (
                                                                <div className="absolute top-0 right-0 bg-yellow-500/10 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg border-l border-b border-yellow-500/20 uppercase">
                                                                    Leader
                                                                </div>
                                                            )}
                                                            <div className="mb-2">
                                                                <h4 className="font-bold text-white text-sm line-clamp-1">{m.name}</h4>
                                                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 mb-2">{m.regNo?.replace('GOOGLE_USER', 'N/A')}</div>

                                                                <div className="space-y-1.5 border-t border-white/5 pt-2">
                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                        <span className="text-zinc-500 uppercase font-bold">Phone</span>
                                                                        <span className="text-zinc-300 font-mono">{m.profile?.mobileNumber || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                        <span className="text-zinc-500 uppercase font-bold">College</span>
                                                                        <span className="text-zinc-300 truncate max-w-[100px] text-right" title={m.profile?.collegeName}>{m.profile?.collegeName || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                                                                {(m.profile?.idCardUrl || reg.display?.idCard) && (
                                                                    <a href={m.profile?.idCardUrl || reg.display?.idCard} target="_blank" className="flex items-center gap-1 text-[9px] font-bold uppercase text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded transition-colors w-fit border border-blue-500/20">
                                                                        <IdCard className="w-3 h-3" /> ID
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {/* Custom Fields */}
                                                            {eventCustomFields.length > 0 && reg.responses && (
                                                                <div className="space-y-2 mt-1 mb-3 bg-white/5 p-2.5 rounded-lg border border-white/10">
                                                                    {eventCustomFields.map(field => {
                                                                        const val = reg.responses?.[field.id];
                                                                        if (!val) return null;
                                                                        const isUrl = String(val).startsWith('http');
                                                                        return (
                                                                            <div key={field.id} className="text-[9px]">
                                                                                <span className="text-zinc-500 uppercase font-black block leading-none mb-1.5 text-[8px] tracking-tight">{field.label}</span>
                                                                                {isUrl ? (
                                                                                    <a href={val} target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-mono flex items-center gap-1 hover:text-indigo-300 break-all underline decoration-indigo-400/30">
                                                                                        <ExternalLink className="w-2 h-2" /> Link
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="text-zinc-300 block leading-tight">{val}</span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {isAttended ? (
                                                                <div className="space-y-2 mt-auto">
                                                                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 h-8 w-full rounded-md font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5">
                                                                        <CheckCircle2 className="w-3 h-3" /> PRESENT
                                                                    </div>
                                                                    <div className="flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/5 shadow-inner">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="AFT"
                                                                            className="h-8 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-[11px] w-14 px-2 font-mono focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                                                                            value={extraRewardAmounts[m.userId] || ''}
                                                                            onChange={(e) => setExtraRewardAmounts(prev => ({ ...prev, [m.userId]: e.target.value }))}
                                                                        />
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleIndividualTransfer(m.regId || reg.id, m.userId, m.profile?.walletAddress, m.name, true, Number(extraRewardAmounts[m.userId]))}
                                                                            disabled={actionLoading === m.userId + '_extra' || !extraRewardAmounts[m.userId] || !rewardEnabled}
                                                                            className="h-8 flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-tighter shadow-lg shadow-yellow-900/10 active:scale-95 transition-transform"
                                                                        >
                                                                            {actionLoading === m.userId + '_extra' ? <CoinLoader size={12} /> : 'Reward'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleIndividualTransfer(m.regId || reg.id, m.userId, m.profile?.walletAddress, m.name, true)}
                                                                    disabled={actionLoading === m.userId || !m.profile?.walletAddress || !rewardEnabled}
                                                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-8 text-[10px] shadow-lg shadow-green-900/20 mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {actionLoading === m.userId ? <CoinLoader size={12} className="mr-1" /> : <Coins className="w-3 h-3 mr-1" />}
                                                                    {m.profile?.walletAddress ? (rewardEnabled ? `Present (10 AFT)` : 'Claims Disabled') : 'No Wallet'}
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
                                    const isAttended = reg.rewardStatus === 'paid' || reg.attendance === true || (typeof reg.attendance === 'object' && reg.attendance && (reg.attendance as any)[reg.userId] === true);
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

                                                {/* Solo Custom Fields */}
                                                {eventCustomFields.length > 0 && reg.responses && (
                                                    <div className="mt-6 space-y-4">
                                                        <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                            <div className="h-px flex-1 bg-white/5" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Additional Information</span>
                                                            <div className="h-px flex-1 bg-white/5" />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {eventCustomFields.map(field => {
                                                                const val = reg.responses?.[field.id];
                                                                if (!val) return null;
                                                                const isUrl = String(val).startsWith('http');

                                                                return (
                                                                    <div key={field.id} className="bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/[0.07] transition-colors">
                                                                        <span className="text-zinc-500 uppercase font-black block mb-2 text-[9px] tracking-wider leading-none">{field.label}</span>
                                                                        {isUrl ? (
                                                                            <a
                                                                                href={val}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-indigo-400 font-mono text-xs break-all hover:text-indigo-300 flex items-center gap-1.5 group"
                                                                            >
                                                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                                <span className="underline decoration-indigo-400/30 group-hover:decoration-indigo-300">Open Link</span>
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-zinc-200 text-xs font-medium leading-relaxed">{val}</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Column */}
                                            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                                                {isAttended ? (
                                                    <div className="space-y-3">
                                                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 h-10 w-full rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" /> PAID & PRESENT
                                                        </div>
                                                        <div className="flex gap-2 items-center bg-black/40 p-2.5 rounded-xl border border-white/5 shadow-inner">
                                                            <Input
                                                                type="number"
                                                                placeholder="Qty"
                                                                className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-sm w-20 font-mono focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                                                                value={extraRewardAmounts[reg.userId] || ''}
                                                                onChange={(e) => setExtraRewardAmounts(prev => ({ ...prev, [reg.userId]: e.target.value }))}
                                                            />
                                                            <Button
                                                                onClick={() => handleIndividualTransfer(reg.id, reg.userId, reg.fullProfile?.walletAddress, reg.display.name, false, Number(extraRewardAmounts[reg.userId]))}
                                                                disabled={actionLoading === reg.userId + '_extra' || !extraRewardAmounts[reg.userId] || !rewardEnabled}
                                                                className="h-10 flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs shadow-lg shadow-yellow-900/10 active:scale-95 transition-transform"
                                                            >
                                                                {actionLoading === reg.userId + '_extra' ? <CoinLoader size={16} /> : 'Send Extra Reward'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            onClick={() => handleIndividualTransfer(reg.id, reg.userId, reg.fullProfile?.walletAddress, reg.display.name, false)}
                                                            disabled={actionLoading === reg.userId || !reg.fullProfile?.walletAddress || !rewardEnabled}
                                                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-10 shadow-lg shadow-green-900/20 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {actionLoading === reg.userId ? <CoinLoader size={16} className="mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
                                                            {rewardEnabled ? `Mark Present (10 AFT)` : 'Claims Disabled'}
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

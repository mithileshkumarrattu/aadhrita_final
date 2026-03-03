'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Lock, LogOut, Users, Trophy, Wallet, Search,
    RefreshCcw, Shield, FileText, CheckCircle2, Eye, IdCard, Coins, XCircle, ExternalLink, BedDouble
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
    collection, query, getDocs, doc, updateDoc,
    onSnapshot, setDoc, getDoc, orderBy, limit
} from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { db, COLLECTIONS, HackathonTeam } from '@/lib/db';
import { CustodialWallet } from '@/components/CustodialWallet';

// --- Types ---
interface HackathonStatConfig {
    qualifiedTeams: number;
    showStatus: boolean;
}

export default function HackathonDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = React.useState(true);
    const [stats, setStats] = React.useState<HackathonStatConfig>({ qualifiedTeams: 0, showStatus: false });
    const [statLoading, setStatLoading] = React.useState(false);

    // Data States
    const [enrolledTeams, setEnrolledTeams] = React.useState<HackathonTeam[]>([]);
    const [legacyTeams, setLegacyTeams] = React.useState<HackathonTeam[]>([]); // New State
    const [staffId, setStaffId] = React.useState<string | undefined>(undefined);

    // Wallet State
    const [walletBalance, setWalletBalance] = React.useState<string>('0');
    const [walletAddress, setWalletAddress] = React.useState<string | null>(null);

    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

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

    // Auth Check
    React.useEffect(() => {
        const checkAuth = () => {
            const session = getStaffSession();
            if (!session || !session.isAuthenticated) {
                router.replace('/faculty'); // Redirect to login
                return;
            }
            if (session.role !== 'hackathon_coordinator') {
                toast.error("Unauthorized: Hackathon Coordinator Access Required");
                router.replace('/faculty');
                return;
            }
            setStaffId(session.id); // Set Staff ID for Wallet
            fetchWalletBalance(session.id);
            setLoading(false);
        };
        checkAuth();
    }, [router]);

    // Fetch Config (Real-time)
    React.useEffect(() => {
        if (loading) return;
        const unsub = onSnapshot(doc(db, COLLECTIONS.EVENTS, 'hackathon'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    qualifiedTeams: data.stats?.qualifiedTeams || 0,
                    showStatus: data.stats?.showStatus || false
                });
            }
        });
        return () => unsub();
    }, [loading]);

    // Fetch Data (Real-time)
    React.useEffect(() => {
        if (loading) return;

        // 1. Enrolled Teams Listener
        const qEnrolled = query(collection(db, COLLECTIONS.HACKATHON), orderBy('createdAt', 'desc'));
        const unsubEnrolled = onSnapshot(qEnrolled, (snap) => {
            const teams = snap.docs.map(d => ({ id: d.id, ...d.data() } as HackathonTeam));
            setEnrolledTeams(teams);
        }, (error) => {
            console.error("Enrolled Teams Listener Error:", error);
            toast.error("Lost connection to Teams data");
        });

        return () => {
            unsubEnrolled();
        };
    }, [loading]);

    // Fetch Legacy Teams (One-time)
    React.useEffect(() => {
        if (loading) return;
        const fetchLegacy = async () => {
            try {
                // Fetch from legacy collection 'reg_hackathon'
                const q = query(collection(db, 'reg_hackathon'));
                const snap = await getDocs(q);
                const legacy = snap.docs.map(doc => {
                    const data = doc.data() as any;
                    // Map close enough to HackathonTeam
                    return {
                        id: doc.id,
                        teamName: data.teamName,
                        teamSize: data.teamSize,
                        collegeName: data.collegeName,
                        collegeCity: data.collegeCity,
                        collegeState: data.collegeState,
                        leader: data.leader,
                        members: data.members, // Array of maps per snippet
                        pptUrl: data.pptUrl,
                        pptTitle: data.pptTitle,
                        status: data.status || 'pending', // Use doc status or default to pending
                        paymentStatus: data.paymentStatus || 'pending', // Use doc paymentStatus or default to pending
                        createdAt: data.createdAt,
                        communicationChannel: data.communicationChannel,
                        emergencyContact: data.emergencyContact,
                        referralSource: data.referralSource,
                        _collection: 'reg_hackathon', // Metadata for updates
                        isLegacy: true // custom flag
                    } as HackathonTeam & { isLegacy?: boolean; _collection?: string };
                });
                setLegacyTeams(legacy);
            } catch (error) {
                console.error("Legacy Fetch Error:", error);
                toast.error("Failed to load some legacy teams");
            }
        };
        fetchLegacy();
    }, [loading]);

    // Derived list
    const allEnrolledTeams = [...enrolledTeams, ...legacyTeams].sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA; // Descending
    });

    // Fix: Derive Paid Teams directly from Enrolled list to ensure consistency
    const derivedPaidTeams = allEnrolledTeams.filter(t => t.paymentStatus === 'success' || t.paymentStatus === 'paid');

    const accommodatedStudents = React.useMemo(() => {
        const students: any[] = [];
        derivedPaidTeams.forEach(team => {
            if (team.leader?.accommodation?.mar11 || team.leader?.accommodation?.mar13) {
                students.push({
                    teamName: team.teamName,
                    name: team.leader.name,
                    regNo: team.leader.regNo,
                    phone: team.leader.phone,
                    role: 'Leader',
                    mar11: !!team.leader.accommodation?.mar11,
                    mar13: !!team.leader.accommodation?.mar13
                });
            }
            team.members?.forEach((m, idx) => {
                if (m?.accommodation?.mar11 || m?.accommodation?.mar13) {
                    students.push({
                        teamName: team.teamName,
                        name: m.name,
                        regNo: m.regNo,
                        phone: m.phone,
                        role: `Member ${idx + 2}`,
                        mar11: !!m.accommodation?.mar11,
                        mar13: !!m.accommodation?.mar13
                    });
                }
            });
        });
        return students;
    }, [derivedPaidTeams]);

    const [activeTab, setActiveTab] = React.useState('enrolled');

    // Actions
    const handleStatusUpdate = async (team: HackathonTeam & { _collection?: string }, newStatus: 'approved' | 'rejected') => {
        if (!team.id) return;
        if (!confirm(`Are you sure you want to ${newStatus} this team?`)) return;

        setActionLoading(team.id);
        try {
            // Determine collection based on metadata
            const collectionName = team._collection || COLLECTIONS.HACKATHON;

            await updateDoc(doc(db, collectionName, team.id), {
                status: newStatus
            });

            // Optimistic update
            if (team._collection === 'reg_hackathon') {
                setLegacyTeams(prev => prev.map(t => t.id === team.id ? { ...t, status: newStatus } : t));
            }

            toast.success(`Team ${newStatus} successfully`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    // Helper for Accommodation Badge
    const getAccomBadge = (accom: any) => {
        if (!accom) return null;
        const days = [];
        if (accom.mar11) days.push('11');
        if (accom.mar13) days.push('13');
        if (days.length === 0) return null;

        return (
            <div className="absolute top-0 right-0 bg-blue-900/80 backdrop-blur-sm p-1.5 px-3 rounded-bl-xl border-l border-b border-blue-500/30 flex flex-col items-end shadow-lg z-10" title="Accommodation Requested">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] uppercase font-bold text-blue-200">Accommodation</span>
                    <BedDouble className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-xs font-bold text-white leading-none">
                    {days.join(' & ')} Mar <span className="text-blue-400 text-[10px] font-normal">({days.length} Day{days.length > 1 ? 's' : ''})</span>
                </div>
            </div>
        );
    };

    // CSV Download Logic
    const downloadCSV = () => {
        if (activeTab === 'accommodation') {
            if (accommodatedStudents.length === 0) {
                toast.error("No accommodation data to export");
                return;
            }
            const headers = ["Team Name", "Student Name", "Reg No", "Phone", "Role", "Mar 11", "Mar 13"];
            const match = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

            const rows = accommodatedStudents.map(s => [
                match(s.teamName), match(s.name), match(s.regNo), match(s.phone), match(s.role),
                match(s.mar11 ? 'Yes' : 'No'), match(s.mar13 ? 'Yes' : 'No')
            ].join(","));

            const csvContent = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `hackathon_accommodation_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const allTeamsFn = activeTab === 'paid' ? derivedPaidTeams : [...enrolledTeams, ...legacyTeams];
        if (allTeamsFn.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = [
            "Team Name", "Team Size", "College", "City", "State", "Status", "Payment Status",
            "Leader Name", "Leader RegNo", "Leader Email", "Leader Phone", "Leader Dept", "Leader Year", "Leader ID URL", "Leader Accom Mar11", "Leader Accom Mar13",
            "Member 2 Name", "Member 2 RegNo", "Member 2 Email", "Member 2 Phone", "Member 2 Dept", "Member 2 Year", "Member 2 ID URL", "Member 2 Accom Mar11", "Member 2 Accom Mar13",
            "Member 3 Name", "Member 3 RegNo", "Member 3 Email", "Member 3 Phone", "Member 3 Dept", "Member 3 Year", "Member 3 ID URL", "Member 3 Accom Mar11", "Member 3 Accom Mar13",
            "Member 4 Name", "Member 4 RegNo", "Member 4 Email", "Member 4 Phone", "Member 4 Dept", "Member 4 Year", "Member 4 ID URL", "Member 4 Accom Mar11", "Member 4 Accom Mar13",
            "PPT Title", "PPT URL", "Communication Channel", "Emergency Contact", "Referral", "Created At"
        ];

        const match = (val: any) => {
            if (val === null || val === undefined) return "";
            const str = String(val);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const rows = allTeamsFn.map(team => {
            const members = team.members || [];
            const memberCols: string[] = [];

            for (let i = 0; i < 3; i++) {
                const m = members[i];
                if (m) {
                    memberCols.push(
                        match(m.name), match(m.regNo), match(m.email), match(m.phone),
                        match(m.dept), match(m.year), match(m.idCardUrl),
                        match(m.accommodation?.mar11 ? 'Yes' : 'No'), match(m.accommodation?.mar13 ? 'Yes' : 'No')
                    );
                } else {
                    memberCols.push("", "", "", "", "", "", "", "", "");
                }
            }

            return [
                match(team.teamName),
                match(team.teamSize),
                match(team.collegeName),
                match(team.collegeCity),
                match(team.collegeState),
                match(team.status),
                match(team.paymentStatus),
                // Leader
                match(team.leader?.name),
                match(team.leader?.regNo),
                match(team.leader?.email),
                match(team.leader?.phone),
                match(team.leader?.dept),
                match(team.leader?.year),
                match(team.leader?.idCardUrl),
                match(team.leader?.accommodation?.mar11 ? 'Yes' : 'No'),
                match(team.leader?.accommodation?.mar13 ? 'Yes' : 'No'),
                // Members (2-4)
                ...memberCols,
                // Meta
                match(team.pptTitle),
                match(team.pptUrl),
                match(team.communicationChannel),
                match(team.emergencyContact),
                match(team.referralSource),
                match(team.createdAt?.seconds ? new Date(team.createdAt.seconds * 1000).toLocaleString() : '')
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `hackathon_${activeTab}_teams_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const updateStats = async () => {
        setStatLoading(true);
        try {
            const ref = doc(db, COLLECTIONS.EVENTS, 'hackathon');
            // Ensure doc exists
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, {
                    title: 'Hackathon',
                    stats: { qualifiedTeams: stats.qualifiedTeams, showStatus: stats.showStatus }
                }, { merge: true });
            } else {
                await updateDoc(ref, {
                    'stats.qualifiedTeams': Number(stats.qualifiedTeams),
                    'stats.showStatus': stats.showStatus
                });
            }
            toast.success("Public Status Updated");
        } catch (e) {
            console.error(e);
            toast.error("Update Failed");
        } finally {
            setStatLoading(false);
        }
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/faculty');
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Verifying Access...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500/30">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none">Hackathon Administration</h1>
                            <p className="text-xs text-neutral-500 font-mono mt-1">COORDINATOR ACCESS</p>
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
                    {/* 1. Status Config Card */}
                    <Card className="bg-zinc-900/50 border-white/10 p-6 md:col-span-2">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Public Status Control
                                </h2>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Update the &quot;Qualified Teams&quot; count visible on the landing page.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                                <span className="text-xs font-bold text-yellow-500 uppercase">Landing Page</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">Qualified Teams Count</label>
                                    <Input
                                        type="number"
                                        value={stats.qualifiedTeams}
                                        onChange={e => setStats(s => ({ ...s, qualifiedTeams: parseInt(e.target.value) || 0 }))}
                                        className="bg-black border-white/10 h-12 text-2xl font-mono font-bold text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={updateStats}
                                        disabled={statLoading}
                                        className="bg-white text-black hover:bg-neutral-200 font-bold"
                                    >
                                        {statLoading ? 'Updating...' : 'Publish Update'}
                                    </Button>
                                    {stats.showStatus && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> LIVE</span>}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 2. Coordinator Wallet */}
                    <Card className="md:col-span-1 bg-zinc-900/50 border-zinc-800 p-6 flex flex-col justify-center">
                        <div className="flex flex-col gap-4">
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
                        </div>
                    </Card>
                </div>

                {/* Main Data Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <TabsList className="bg-zinc-900 border border-white/10 p-1 h-auto w-full md:w-auto flex-wrap justify-start">
                            <TabsTrigger value="enrolled" className="px-6 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-bold text-neutral-400">
                                Enrolled Teams <span className="ml-2 bg-neutral-800 px-2 py-0.5 rounded-full text-xs text-white">{allEnrolledTeams.length}</span> (Legacy: {legacyTeams.length})
                            </TabsTrigger>
                            <TabsTrigger value="paid" className="px-6 py-2.5 data-[state=active]:bg-green-900/30 data-[state=active]:text-green-400 font-bold text-neutral-400">
                                Paid Registrations <span className="ml-2 bg-green-900/50 px-2 py-0.5 rounded-full text-xs text-green-400">{derivedPaidTeams.length}</span>
                            </TabsTrigger>
                            <TabsTrigger value="accommodation" className="px-6 py-2.5 data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400 font-bold text-neutral-400">
                                Accommodation <span className="ml-2 bg-blue-900/50 px-2 py-0.5 rounded-full text-xs text-blue-400">{accommodatedStudents.length}</span>
                            </TabsTrigger>
                        </TabsList>

                        <Button onClick={downloadCSV} variant="outline" className="border-white/10 hover:bg-white/5 gap-2 text-green-400 border-green-900/30 bg-green-900/10">
                            <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg></div>
                            Export CSV
                        </Button>
                    </div>

                    {/* Content: Enrolled Teams */}
                    <TabsContent value="enrolled" className="space-y-4">
                        {allEnrolledTeams.length === 0 ? (
                            <div className="text-center py-20 text-neutral-500 border border-white/5 rounded-xl bg-white/5">No enrollments found yet.</div>
                        ) : (
                            allEnrolledTeams.map((team) => {
                                const isPaid = team.paymentStatus === 'success' || team.paymentStatus === 'paid';

                                return (
                                    <Card key={team.id} className={`bg-zinc-900 p-6 transition-all relative overflow-hidden group ${isPaid ? 'border-green-500/50 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]' : 'border-white/5 hover:border-white/10'}`}>
                                        {/* Payment Status Badge */}
                                        <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl border-l border-b ${isPaid ? 'bg-green-500 text-black border-green-600' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'}`}>
                                            {isPaid ? 'PAYMENT VERIFIED' : 'PAYMENT PENDING'}
                                        </div>
                                        <div className="flex flex-col lg:flex-row gap-6">
                                            {/* Left Column: Team Identity */}
                                            <div className="lg:w-1/4 space-y-4 border-b lg:border-b-0 lg:border-r border-white/5 pb-4 lg:pb-0 lg:pr-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`w-2 h-2 rounded-full ${team.status === 'approved' ? 'bg-green-500' : team.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                                        <span className="text-xs uppercase font-bold text-zinc-500">{team.status}</span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white leading-tight">{team.teamName}</h3>
                                                    <p className="text-sm text-zinc-400 mt-1">{team.collegeName}</p>
                                                    <p className="text-xs text-zinc-600">{team.collegeCity}, {team.collegeState}</p>
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    {team.pptUrl ? (
                                                        <a href={team.pptUrl} target="_blank" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 w-fit">
                                                            <FileText className="w-4 h-4" />
                                                            View Submission PPT
                                                        </a>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-800 px-3 py-2 rounded-lg w-fit">
                                                            <FileText className="w-4 h-4" /> No PPT
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-zinc-600 font-mono">ID: {team.id}</div>
                                                </div>

                                                {/* Action Buttons (Immediate Access) */}
                                                <div className="flex gap-2 pt-2">
                                                    {team.status !== 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStatusUpdate(team, 'approved')}
                                                            disabled={actionLoading === team.id}
                                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                                                        >
                                                            {actionLoading === team.id ? '...' : 'Approve'}
                                                        </Button>
                                                    )}
                                                    {team.status !== 'rejected' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleStatusUpdate(team, 'rejected')}
                                                            disabled={actionLoading === team.id}
                                                            className="flex-1 text-red-500 hover:bg-red-900/20 hover:text-red-400 border border-white/5"
                                                        >
                                                            Reject
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Column: Members Grid */}
                                            <div className="flex-1">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {/* Leader Card */}
                                                    <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 relative overflow-hidden">
                                                        {getAccomBadge(team.leader?.accommodation)}
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Team Leader</span>
                                                            <a href={team.leader?.idCardUrl} target="_blank" className="text-zinc-500 hover:text-white"><ExternalLink className="w-3 h-3" /></a>
                                                        </div>
                                                        <div className="font-bold text-white text-sm">{team.leader?.name}</div>
                                                        <div className="text-xs text-zinc-400 font-mono">{team.leader?.regNo}</div>
                                                        <div className="mt-2 text-xs text-zinc-500 space-y-0.5">
                                                            <div>{team.leader?.phone}</div>
                                                            <div className="truncate">{team.leader?.email}</div>
                                                            <div>{team.leader?.dept} - {team.leader?.year}</div>
                                                        </div>
                                                    </div>

                                                    {/* Members List */}
                                                    {team.members?.map((member, idx) => (
                                                        <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 relative overflow-hidden">
                                                            {getAccomBadge(member.accommodation)}
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Member {idx + 2}</span>
                                                                {member.idCardUrl && (
                                                                    <a href={member.idCardUrl} target="_blank" className="text-zinc-500 hover:text-white"><ExternalLink className="w-3 h-3" /></a>
                                                                )}
                                                            </div>
                                                            <div className="font-bold text-white text-sm">{member.name}</div>
                                                            <div className="text-xs text-zinc-400 font-mono">{member.regNo}</div>
                                                            <div className="mt-2 text-xs text-zinc-500 space-y-0.5">
                                                                <div>{member.phone}</div>
                                                                <div>{member.dept} - {member.year}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </TabsContent>

                    {/* Content: Paid Registrations */}
                    <TabsContent value="paid" className="animate-in fade-in slide-in-from-bottom-4">
                        <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-green-400/70 uppercase bg-green-900/10 border-b border-green-500/10">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Team Name</th>
                                            <th className="px-6 py-4 font-bold">Leader</th>
                                            <th className="px-6 py-4 font-bold">Txn ID</th>
                                            <th className="px-6 py-4 font-bold">Amount</th>
                                            <th className="px-6 py-4 font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {derivedPaidTeams.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-neutral-500">No paid registrations yet.</td></tr>
                                        ) : (
                                            derivedPaidTeams.map((team) => {
                                                const amount = team.totalAmount || team.hackathonTotal || 600;
                                                return (
                                                    <tr key={team.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-white">
                                                            {team.teamName}
                                                        </td>
                                                        <td className="px-6 py-4 text-neutral-300">
                                                            {team.leader?.name}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs text-neutral-500">
                                                            {team.transactionId || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-white">
                                                            ₹{amount}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                                                                PAID
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Content: Accommodation */}
                    <TabsContent value="accommodation" className="animate-in fade-in slide-in-from-bottom-4">
                        <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-blue-400/70 uppercase bg-blue-900/10 border-b border-blue-500/10">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Student Name</th>
                                            <th className="px-6 py-4 font-bold">Reg No</th>
                                            <th className="px-6 py-4 font-bold">Team</th>
                                            <th className="px-6 py-4 font-bold">Phone</th>
                                            <th className="px-6 py-4 font-bold">Mar 11</th>
                                            <th className="px-6 py-4 font-bold">Mar 13</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {accommodatedStudents.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500">No accommodation requests found from paid teams.</td></tr>
                                        ) : (
                                            accommodatedStudents.map((student, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-white">
                                                        {student.name} <span className="text-[10px] text-zinc-500 font-normal ml-2">({student.role})</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-zinc-400">{student.regNo}</td>
                                                    <td className="px-6 py-4 font-medium text-white">{student.teamName}</td>
                                                    <td className="px-6 py-4 font-mono text-zinc-400">{student.phone}</td>
                                                    <td className="px-6 py-4">
                                                        {student.mar11 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500/30" />}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {student.mar13 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500/30" />}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
}

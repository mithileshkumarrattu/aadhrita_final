'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { db, Event, EventRegistration } from '@/lib/db';
import { doc, getDoc, collection, getDocs, orderBy, query, limit, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Loader2, Download, RefreshCw, FileText, Filter, Users, Ticket, Building2, Globe, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { EventService } from '@/services/EventService';
import { useLiveOverview, EventSummaryRow } from './summary';
import { Card } from '@/components/ui/card';

export default function FacultyRegistrationsPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // State
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [branchFilter, setBranchFilter] = useState<string>('ALL');

    // Live Overview Hook (Only active when Overview or Entry Pass is selected)
    const { summaryData: overviewData, usersData: entryPassesData, overviewLoading, refreshSummary } = useLiveOverview(
        selectedEventId === 'OVERVIEW' || selectedEventId === 'ENTRY_PASS' ? events : []
    );

    // ── Branch Filter Helpers ──────────────────────────────────────────────
    // Case-insensitive MVGR check — same logic as summary.ts
    const isMvgrCollege = (collegeName: any, email?: string) => {
        const c = String(collegeName || '').toUpperCase();
        if (c.includes('MVGR') || c.includes('MAHARAJ') || c.includes('VIJAYARAM') || c.includes('GAJAPATHI')) return true;
        if (email && String(email).toLowerCase().endsWith('@mvgrce.edu.in')) return true;
        return false;
    };

    // Normalise branch name → canonical form using wildcard matching to collapse free-text entries.
    const normBranch = (raw: any): string => {
        if (!raw) return 'OTHER';
        const s = String(raw).toUpperCase().trim();

        if (
            s.includes('CSD') || s.includes('DATA SCIE') || s.includes('DATA ENG') || s === 'DE' ||
            s.includes('CSM') || s.includes('MACHINE') || s.includes('ML') || s.includes('ARTIFICIAL') ||
            s.includes('CIC') || s.includes('IOT') || s.includes('CYBER') || s.includes('CC') ||
            s.includes('CSAM') || (s.includes('AI') && s.includes('M'))
        ) {
            return 'DATA ENGINEERING';
        }
        if (s.startsWith('CS') || s === 'COMPUTER SCIENCE' || s.includes('COMPUTER SCIENCE AND ENGINEERING')) return 'CSE';
        if (s.startsWith('ECE') || s.includes('ELECTRONICS')) return 'ECE';
        if (s.startsWith('EEE') || s.includes('ELECTRICAL')) return 'EEE';
        if (s.includes('MECH')) return 'MECH';
        if (s.includes('CIVIL') || s.includes('CVIL')) return 'CIVIL';
        if (s === 'IT' || s.includes('INFORM') || s.includes('IECT') || s.includes('IE&CT') || s.includes('IE & CT')) return 'IE&CT';
        if (s.includes('MBA') || s.includes('BUSINESS')) return 'MBA';
        if (s.includes('CHE')) return 'CHEMICAL';

        return 'OTHER';
    };

    // Reset branch filter when the event tab changes
    React.useEffect(() => { setBranchFilter('ALL'); }, [selectedEventId]);

    // 1. Auth Check & Fetch All Events for Dropdown
    useEffect(() => {
        const session = getStaffSession();
        if (!session || session.role !== 'registrations_viewer') {
            router.replace('/faculty');
            return;
        }
        setIsAuthenticated(true);

        const fetchEvents = async () => {
            try {
                const allEvents = await EventService.getAllEvents();
                setEvents(allEvents);
                if (allEvents.length > 0) {
                    setSelectedEventId('OVERVIEW'); // Default to overview
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load events");
            } finally {
                setInitLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Cache for User Profiles to avoid re-fetching
    const [userProfilesCache, setUserProfilesCache] = useState<Record<string, any>>({});

    // ── Derived: filtered lists for ENTRY_PASS and individual event views ──
    const filteredEntryPasses = React.useMemo(() => {
        return entryPassesData.filter(u => {
            if (!isMvgrCollege(u.collegeName, u.email)) return false; // MVGR only
            if (branchFilter === 'ALL') return true;
            return normBranch(u.degreeBranch) === branchFilter;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryPassesData, branchFilter]);

    const filteredRegistrations = React.useMemo(() => {
        if (selectedEventId === 'OVERVIEW' || selectedEventId === 'ENTRY_PASS') return registrations;
        return registrations.filter(reg => {
            const u = (reg.userSnapshot as any) || {};
            if (!isMvgrCollege(u.collegeName, u.email)) return true; // keep non-MVGR always
            if (branchFilter === 'ALL') return true;
            return normBranch(u.degreeBranch) === branchFilter;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registrations, branchFilter, selectedEventId]);

    // Unique MVGR branches from current data (case-insensitive deduplication)
    const uniqueBranches = React.useMemo(() => {
        const set = new Set<string>();
        if (selectedEventId === 'ENTRY_PASS') {
            entryPassesData.forEach(u => {
                if (isMvgrCollege(u.collegeName, u.email) && u.degreeBranch) set.add(normBranch(u.degreeBranch));
            });
        } else if (selectedEventId !== 'OVERVIEW') {
            registrations.forEach(reg => {
                const u = (reg.userSnapshot as any) || {};
                if (isMvgrCollege(u.collegeName, u.email) && u.degreeBranch) set.add(normBranch(u.degreeBranch));
            });
        }
        return Array.from(set).sort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryPassesData, registrations, selectedEventId]);

    // 2. Real-time Registrations Listener (Optimized)
    useEffect(() => {
        if (!selectedEventId) return;

        setLoading(true);

        if (selectedEventId === 'OVERVIEW') {
            setLoading(false);
            return;
        }

        // precise-fetch event details
        EventService.getEventById(selectedEventId).then(ev => {
            // @ts-ignore
            if (ev) setCurrentEvent(ev);
        });

        const regsRef = collection(db, 'events', selectedEventId, 'registrations');
        const q = query(regsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot<DocumentData>) => {
            const rawRegs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(r => r.paymentStatus === 'success' || r.paymentStatus === 'paid' || r.status === 'approved');

            // 1. Identify missing user profiles
            const idsToFetch = new Set<string>();
            rawRegs.forEach(r => {
                if (!r.userSnapshot && !userProfilesCache[r.userId]) {
                    idsToFetch.add(r.userId);
                }
            });

            // 2. Fetch missing profiles in batches
            const newProfiles = { ...userProfilesCache };
            const idsArray = Array.from(idsToFetch);

            if (idsArray.length > 0) {
                const chunkArray = (arr: string[], size: number) => {
                    const chunks = [];
                    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
                    return chunks;
                };

                const chunks = chunkArray(idsArray, 10);
                const { documentId, where, query: queryAlias, collection: colAlias, getDocs: getDocsAlias } = await import('firebase/firestore');

                await Promise.all(chunks.map(async (chunk) => {
                    const usersQ = queryAlias(colAlias(db, 'users'), where(documentId(), 'in', chunk));
                    const snaps = await getDocsAlias(usersQ);
                    snaps.forEach(d => { newProfiles[d.id] = d.data(); });
                }));

                setUserProfilesCache(newProfiles);
            }

            // 3. Merge
            const enrichedRegs = rawRegs.map(r => {
                // Use snapshot if exists, else cache, else fallback
                const profile = r.userSnapshot || newProfiles[r.userId];
                return profile ? { ...r, userSnapshot: profile } : r;
            });

            setRegistrations(enrichedRegs);
            setLoading(false);
        }, (error) => {
            console.error("Real-time listener error:", error);
            toast.error("Live updates failed");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedEventId]); // Dependency on ID changes listener

    // Removed manual fetchRegistrations as it is now live.


    // 3. Export Logic (Advanced)
    const downloadCSV = () => {
        if (selectedEventId === 'ENTRY_PASS') {
            if (entryPassesData.length === 0) return;
            const headers = ["Student Name", "Reg No", "Email", "Phone", "College", "Branch", "Year", "Status"];
            const rows = entryPassesData.map(u => [
                `"${u.fullName || ''}"`, `"${u.regNo || ''}"`, `"${u.email || ''}"`, `"${u.mobileNumber || ''}"`,
                `"${u.collegeName || ''}"`, `"${u.degreeBranch || ''}"`, `"${u.yearOfStudy || ''}"`, '"Active"'
            ].join(','));
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Entry_Passes_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        if (selectedEventId === 'OVERVIEW') {
            if (overviewData.length === 0) return;
            const headers = [
                "Event Name",
                "Type",
                "Total Teams",
                "MVGR Participants",
                "Other Participants",
                "Total Participants"
            ];
            const rows = overviewData.map(row => [
                `"${row.eventName}"`,
                row.type,
                row.totalTeams || '-',
                row.mvgrParticipants,
                row.otherParticipants,
                row.totalParticipants
            ].join(','));

            // Add Grand Total
            const totalMvgr = overviewData.reduce((acc, r) => acc + r.mvgrParticipants, 0);
            const totalOther = overviewData.reduce((acc, r) => acc + r.otherParticipants, 0);
            rows.push(`"GRAND TOTAL",,,"${totalMvgr}","${totalOther}","${totalMvgr + totalOther}"`);

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Master_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        if (!currentEvent || registrations.length === 0) return;

        // Base Headers
        const headers = [
            "Registration ID",
            "Role",
            "Full Name",
            "Email",
            "Mobile",
            "College",
            "Year",
            "Branch",
            "Payment Status",
            "Payment ID (Txn)",
        ];

        // Dynamic Headers from Form Config
        if (currentEvent.formConfig?.askTeamName) headers.push("Team Name");
        if (currentEvent.formConfig?.askPptUrl) headers.push("PPT URL");

        // Custom Fields Headers
        currentEvent.formConfig?.customFields?.forEach(field => {
            headers.push(field.label);
        });

        // Team Members Headers (Max 4 for now, or dynamic?)
        // Let's add columns for up to maxTeamSize members.
        const maxMembers = currentEvent.maxTeamSize || 4;
        for (let i = 1; i < maxMembers; i++) { // Start from 1 as 0 is Leader (self)
            headers.push(`Member ${i} Name`);
            headers.push(`Member ${i} RegNo`);
            headers.push(`Member ${i} Phone`);
            headers.push(`Member ${i} ID Card`);
        }

        headers.push("Registered At");

        // Rows
        const rows = registrations.map(reg => {
            const u = reg.userSnapshot;
            const r = reg.responses || {};

            const rowData = [
                reg.id,
                reg.role || 'Individual',
                u?.fullName || 'Unknown',
                u?.email || 'N/A', // Now guaranteed
                u?.mobileNumber || 'N/A',
                u?.collegeName || 'N/A',
                u?.yearOfStudy || '',
                u?.degreeBranch || '',
                reg.paymentStatus,
                reg.paymentId || '',
            ];

            // Dynamic Data
            if (currentEvent.formConfig?.askTeamName) rowData.push(r.teamName || '');
            if (currentEvent.formConfig?.askPptUrl) rowData.push(r.pptUrl || '');

            // Custom Fields Data
            currentEvent.formConfig?.customFields?.forEach(field => {
                const val = r[field.label] || r[field.id] || '';
                rowData.push(val);
            });

            // Team Members Data
            for (let i = 1; i < maxMembers; i++) {
                // If reg.teamMembers exists, it usually implies Leader.
                // However, `teamMembers` array index 0 is sometimes used or sometimes it's pure members.
                // In our logic: Leader creates team. `teamMembers` array contains OTHER members.
                // So index 0 of `teamMembers` is actually Member 1 (the first added member).
                const member = reg.teamMembers?.[i - 1];
                if (member) {
                    rowData.push(member.name || '');
                    rowData.push(member.regNo || '');
                    rowData.push(member.phone || '');
                    rowData.push(member.idCardUrl || '');
                } else {
                    rowData.push('');
                    rowData.push('');
                    rowData.push('');
                    rowData.push('');
                }
            }

            rowData.push(reg.createdAt?.seconds ? new Date(reg.createdAt.seconds * 1000).toLocaleString() : '');

            return rowData.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${currentEvent.id}_FULL_DATA_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (initLoading || !isAuthenticated) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const totalMvgr = overviewData.reduce((acc, r) => acc + r.mvgrParticipants, 0);
    const totalOther = overviewData.reduce((acc, r) => acc + r.otherParticipants, 0);
    const totalParticipants = overviewData.reduce((acc, r) => acc + r.totalParticipants, 0);

    // Core Metrics
    const entryPassRow = overviewData.find(r => r.id === 'ENTRY_PASS');
    const hackathonRow = overviewData.find(r => r.id === 'HACKATHON');

    const epMvgr = entryPassRow?.mvgrParticipants || 0;
    const epOther = entryPassRow?.otherParticipants || 0;

    const htMvgr = hackathonRow?.mvgrParticipants || 0;
    const htOther = hackathonRow?.otherParticipants || 0;

    // Regular Events
    const eventsMvgr = totalMvgr - epMvgr - htMvgr;
    const eventsOther = totalOther - epOther - htOther;
    const eventsTotal = eventsMvgr + eventsOther;

    // Revenue Calculation Breakdown (New Tiers)
    const revEpMvgr = epMvgr * 200;
    const revEpOther = epOther * 300;
    const revHt = (htMvgr + htOther) * 600;
    const revEvents = eventsTotal * 100;

    const expectedRevenue = revEpMvgr + revEpOther + revHt + revEvents;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500/30">
            {/* Header & Nav */}
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none">Global Registrations</h1>
                            <p className="text-xs text-neutral-500 font-mono mt-1">MASTER VIEW</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs font-mono text-neutral-400">ON-DEMAND</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { clearStaffSession(); router.push('/faculty'); }} className="text-red-400 hover:text-white hover:bg-red-500/20">
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Controls */}
                <Card className="bg-zinc-900/50 border-white/10 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="bg-black p-2 rounded-lg border border-white/5">
                            <Filter className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div className="w-full md:w-[320px]">
                            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                                <SelectTrigger className="w-full bg-black border-white/10 text-white font-bold h-12">
                                    <SelectValue placeholder="Select Event filter..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    <SelectItem value="OVERVIEW" className="font-bold text-indigo-400 focus:bg-white/5 focus:text-indigo-300">
                                        📊 All Events Overview (Live)
                                    </SelectItem>
                                    <SelectItem value="ENTRY_PASS" className="font-bold text-emerald-400 focus:bg-white/5 focus:text-emerald-300">
                                        🎫 General Entry Passes
                                    </SelectItem>
                                    <SelectItem value="BRANCH_WISE" className="font-bold text-sky-400 focus:bg-white/5 focus:text-sky-300">
                                        🏫 Branch / Dept Wise (MVGR)
                                    </SelectItem>
                                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                                    {events.map(ev => (
                                        <SelectItem key={ev.id} value={ev.id} className="focus:bg-white/5 focus:text-white">
                                            {ev.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {(selectedEventId === 'OVERVIEW' || selectedEventId === 'ENTRY_PASS' || selectedEventId === 'BRANCH_WISE') && (
                            <Button
                                onClick={() => refreshSummary()}
                                disabled={overviewLoading}
                                variant="outline"
                                className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-12 px-4 font-bold"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${overviewLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        )}
                        <Button onClick={downloadCSV} disabled={selectedEventId === 'OVERVIEW' ? overviewData.length === 0 : registrations.length === 0} className="bg-white text-black hover:bg-neutral-200 font-bold h-12 px-6">
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                    </div>
                </Card>

                {/* --- OVERVIEW CONTENT --- */}
                {selectedEventId === 'OVERVIEW' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* DETAILED FINANCIAL & IMPACT BREAKDOWN */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Entry Passes */}
                            <Card className="bg-zinc-900/50 border-emerald-500/20 p-5 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 text-emerald-500 transition-transform"><Ticket className="w-16 h-16" /></div>
                                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Ticket className="w-3 h-3" /> Entry Passes</span>
                                <div className="space-y-3 relative z-10">
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> <span className="text-xs text-zinc-400">MVGR (<span className="text-blue-400 font-mono">₹200</span>)</span></div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-white">{epMvgr} <span className="text-[10px] font-normal text-zinc-500">sold</span></div>
                                            <div className="text-xs font-mono text-emerald-400">₹{revEpMvgr.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> <span className="text-xs text-zinc-400">External (<span className="text-amber-400 font-mono">₹300</span>)</span></div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-white">{epOther} <span className="text-[10px] font-normal text-zinc-500">sold</span></div>
                                            <div className="text-xs font-mono text-emerald-400">₹{revEpOther.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Standard Events */}
                            <Card className="bg-zinc-900/50 border-purple-500/20 p-5 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 text-purple-500 transition-transform"><Users className="w-16 h-16" /></div>
                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Standard Events</span>
                                <div className="space-y-3 relative z-10 flex-col flex h-full justify-between pb-1">
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded mt-auto mb-auto">
                                        <div className="flex items-center gap-2 flex-col items-start"><span className="text-xs text-zinc-400">All Participants (<span className="text-purple-400 font-mono">₹100</span>)</span><span className="text-[9px] text-zinc-600">Solo & Team Combined</span></div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-white">{eventsTotal} <span className="text-[10px] font-normal text-zinc-500">ppl</span></div>
                                            <div className="text-sm font-mono text-emerald-400 font-bold">₹{revEvents.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Hackathon */}
                            <Card className="bg-zinc-900/50 border-indigo-500/20 p-5 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 text-indigo-500 transition-transform"><Building2 className="w-16 h-16" /></div>
                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> Hackathon</span>
                                <div className="space-y-3 relative z-10 flex-col flex h-full justify-between pb-1">
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded mt-auto mb-auto">
                                        <div className="flex items-center gap-2 flex-col items-start"><span className="text-xs text-zinc-400">All Participants (<span className="text-indigo-400 font-mono">₹600</span>)</span><span className="text-[9px] text-zinc-600">Leader + Members</span></div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-white">{(htMvgr + htOther)} <span className="text-[10px] font-normal text-zinc-500">ppl</span></div>
                                            <div className="text-sm font-mono text-emerald-400 font-bold">₹{revHt.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Aggregated Total */}
                            <Card className="bg-zinc-900/50 border-emerald-500/30 p-5 flex flex-col relative overflow-hidden group bg-gradient-to-br from-emerald-950/40 to-black">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 text-emerald-400 transition-transform"><TrendingUp className="w-24 h-24" /></div>
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total Treasury</span>
                                <div className="space-y-3 relative z-10 mt-auto">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Footfall</div>
                                            <div className="text-2xl font-black text-white">{totalParticipants} <span className="text-xs font-normal text-zinc-500">records</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Gross Revenue</div>
                                            <div className="text-2xl font-black font-mono text-emerald-400">₹{expectedRevenue.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* LIST VIEWS */}
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Detailed Event Breakdown (Categorized) */}
                            <Card className="lg:col-span-1 bg-zinc-900/50 border-white/10 p-0 flex flex-col h-[600px] overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-black/30">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">PARTICIPATION BREAKDOWN</h3>
                                    <p className="text-xs text-neutral-400">Total individual footfall per sector</p>
                                </div>
                                <div className="space-y-6 overflow-y-auto px-6 py-6 custom-scrollbar flex-1">
                                    {overviewLoading ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
                                    ) : (
                                        <>
                                            {/* Category: Passes */}
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">🎟️ General Access</div>
                                                {overviewData.filter(r => r.id === 'ENTRY_PASS').map(row => (
                                                    <div key={row.id} className="flex justify-between items-center group">
                                                        <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">Entry Passes</span>
                                                        <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{row.totalParticipants}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Category: Hackathon */}
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest border-b border-indigo-500/20 pb-2">💻 Premier Events</div>
                                                {overviewData.filter(r => r.id === 'HACKATHON').map(row => (
                                                    <div key={row.id} className="flex justify-between items-center group">
                                                        <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">Grand Finale Hackathon</span>
                                                        <span className="text-sm font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{row.totalParticipants}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Category: Team */}
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-amber-500/20 pb-2">👥 Team Events</div>
                                                {overviewData.filter(r => r.type === 'Team' && r.id !== 'HACKATHON').sort((a, b) => b.totalParticipants - a.totalParticipants).map(row => (
                                                    <div key={row.id} className="flex justify-between items-center group">
                                                        <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors truncate pr-2" title={row.eventName}>{row.eventName}</span>
                                                        <span className="text-sm font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{row.totalParticipants}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Category: Solo */}
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">👤 Solo Events</div>
                                                {overviewData.filter(r => r.type === 'Solo').sort((a, b) => b.totalParticipants - a.totalParticipants).map(row => (
                                                    <div key={row.id} className="flex justify-between items-center group">
                                                        <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors truncate pr-2" title={row.eventName}>{row.eventName}</span>
                                                        <span className="text-sm font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{row.totalParticipants}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Card>
                            {/* Full Table */}
                            <Card className="lg:col-span-2 bg-zinc-900/50 border-white/10 overflow-hidden flex flex-col h-[600px]">
                                <div className="p-6 border-b border-white/5">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Complete Data Matrix</h3>
                                    <p className="text-xs text-neutral-400">Detailed breakdown by college type</p>
                                </div>
                                <div className="overflow-auto flex-1 custom-scrollbar">
                                    <table className="w-full text-sm text-left relative">
                                        <thead className="bg-black/50 text-neutral-400 font-bold border-b border-white/10 uppercase tracking-wider text-[10px] sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4">Event Name / Event Type</th>
                                                <th className="px-6 py-4 text-center">Team Count</th>
                                                <th className="px-6 py-4 text-center text-blue-400">MVGR Students</th>
                                                <th className="px-6 py-4 text-center text-amber-400">External Students</th>
                                                <th className="px-6 py-4 text-center text-emerald-400 font-black">Total Students</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {overviewData.map(row => (
                                                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white">{row.eventName}</div>
                                                        <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">{row.type}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-mono text-neutral-500">{row.totalTeams || '-'}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-blue-400">{row.mvgrParticipants}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-amber-400">{row.otherParticipants}</td>
                                                    <td className="px-6 py-4 text-center font-black text-emerald-400 text-lg">{row.totalParticipants}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- BRANCH WISE CONTENT --- */}
                {selectedEventId === 'BRANCH_WISE' && (() => {
                    // Build per-branch data from entryPassesData (MVGR only)
                    const branchMap: Record<string, typeof entryPassesData> = {};
                    entryPassesData.forEach(u => {
                        if (!isMvgrCollege(u.collegeName, u.email)) return;
                        const b = normBranch(u.degreeBranch) || 'UNKNOWN';
                        if (!branchMap[b]) branchMap[b] = [];
                        branchMap[b].push(u);
                    });
                    const branchList = Object.keys(branchMap).sort();
                    const activeBranch = branchFilter === 'ALL' ? (branchList[0] || null) : branchFilter;
                    const activeBranchStudents = activeBranch ? (branchMap[activeBranch] || []) : [];

                    return (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-sky-400 flex items-center gap-3">
                                        🏫 Branch / Department View
                                        {overviewLoading && <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />}
                                    </h2>
                                    <p className="text-xs text-neutral-500 mt-1">MVGR College students only · {entryPassesData.filter(u => isMvgrCollege(u.collegeName, u.email)).length} total registered</p>
                                </div>
                            </div>

                            {/* Summary Cards — one per branch */}
                            {branchList.length === 0 && overviewLoading && (
                                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-neutral-500" /></div>
                            )}
                            {branchList.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {branchList.map(b => {
                                        let bColor = 'rgba(56,189,248,1)';
                                        let bBg = 'rgba(56,189,248,0.2)';

                                        if (b === 'CSE') { bColor = '#60a5fa'; bBg = 'rgba(96,165,250,0.12)'; }
                                        else if (b === 'DATA ENGINEERING') { bColor = '#a78bfa'; bBg = 'rgba(167,139,250,0.12)'; }
                                        else if (b === 'ECE') { bColor = '#34d399'; bBg = 'rgba(52,211,153,0.12)'; }
                                        else if (b === 'MECH') { bColor = '#f97316'; bBg = 'rgba(249,115,22,0.12)'; }
                                        else if (b === 'CIVIL') { bColor = '#facc15'; bBg = 'rgba(250,204,21,0.12)'; }
                                        else if (b === 'EEE') { bColor = '#fb7185'; bBg = 'rgba(251,113,133,0.12)'; }
                                        else if (b === 'IE&CT' || b === 'IT') { bColor = '#2dd4bf'; bBg = 'rgba(45,212,191,0.12)'; }
                                        else if (b === 'MBA') { bColor = '#D4AF37'; bBg = 'rgba(212,175,55,0.12)'; }
                                        else { bColor = '#9ca3af'; bBg = 'rgba(156,163,175,0.12)'; }

                                        const isActive = activeBranch === b;

                                        return (
                                            <button
                                                key={b}
                                                onClick={() => setBranchFilter(b)}
                                                style={isActive ? { borderColor: bColor, backgroundColor: bBg, boxShadow: `0 0 15px ${bBg}` } : {}}
                                                className={`rounded-xl p-4 border text-left transition-all hover:scale-105 ${isActive
                                                    ? ''
                                                    : 'bg-zinc-900/60 border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="text-2xl font-black font-mono transition-colors" style={{ color: isActive ? bColor : 'white' }}>
                                                    {branchMap[b].length}
                                                </div>
                                                <div className="text-[11px] font-bold uppercase tracking-wide mt-1 transition-colors" style={{ color: isActive ? bColor : 'rgb(163, 163, 163)' }}>
                                                    {b}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Student Table for selected branch */}
                            {activeBranch && (() => {
                                let aColor = 'rgba(56,189,248,1)';
                                let aBg = 'rgba(56,189,248,0.2)';
                                if (activeBranch === 'CSE') { aColor = '#60a5fa'; aBg = 'rgba(96,165,250,0.15)'; }
                                else if (activeBranch === 'DATA ENGINEERING') { aColor = '#a78bfa'; aBg = 'rgba(167,139,250,0.15)'; }
                                else if (activeBranch === 'ECE') { aColor = '#34d399'; aBg = 'rgba(52,211,153,0.15)'; }
                                else if (activeBranch === 'MECH') { aColor = '#f97316'; aBg = 'rgba(249,115,22,0.15)'; }
                                else if (activeBranch === 'CIVIL') { aColor = '#facc15'; aBg = 'rgba(250,204,21,0.15)'; }
                                else if (activeBranch === 'EEE') { aColor = '#fb7185'; aBg = 'rgba(251,113,133,0.15)'; }
                                else if (activeBranch === 'IE&CT' || activeBranch === 'IT') { aColor = '#2dd4bf'; aBg = 'rgba(45,212,191,0.15)'; }
                                else if (activeBranch === 'MBA') { aColor = '#D4AF37'; aBg = 'rgba(212,175,55,0.15)'; }
                                else { aColor = '#9ca3af'; aBg = 'rgba(156,163,175,0.15)'; }

                                return (
                                    <div className="bg-zinc-900/50 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
                                        <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: aColor }}>
                                                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: aColor, boxShadow: `0 0 8px ${aColor}` }} />
                                                    {activeBranch} Students
                                                </h3>
                                                <p className="text-xs text-neutral-500 mt-0.5">{activeBranchStudents.length} registered · click a branch card above to switch</p>
                                            </div>
                                            <div className="px-3 py-1 text-xs font-mono font-bold rounded-lg border flex items-center gap-2" style={{ color: aColor, backgroundColor: aBg, borderColor: aColor }}>
                                                <Users className="w-4 h-4" /> {activeBranchStudents.length}
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[10px] uppercase tracking-widest text-neutral-500 bg-black/30">
                                                    <tr>
                                                        <th className="px-5 py-4">#</th>
                                                        <th className="px-5 py-4">Name</th>
                                                        <th className="px-5 py-4">Reg. No</th>
                                                        <th className="px-5 py-4">Branch</th>
                                                        <th className="px-5 py-4">Year</th>
                                                        <th className="px-5 py-4">Gender</th>
                                                        <th className="px-5 py-4">Mobile</th>
                                                        <th className="px-5 py-4">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {activeBranchStudents.length === 0 ? (
                                                        <tr><td colSpan={8} className="text-center py-12 text-neutral-500 font-medium">No students found for {activeBranch}.</td></tr>
                                                    ) : (
                                                        activeBranchStudents.map((u, idx) => (
                                                            <tr key={u.userId || idx} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-5 py-3 text-neutral-600 font-mono text-xs">{idx + 1}</td>
                                                                <td className="px-5 py-3">
                                                                    <div className="font-semibold text-white">{u.fullName || '—'}</div>
                                                                </td>
                                                                <td className="px-5 py-3 font-mono text-xs text-neutral-300">{(u as any).registrationNumber || (u as any).regNo || '—'}</td>
                                                                <td className="px-5 py-3">
                                                                    <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[11px] font-bold rounded border border-sky-500/20">{normBranch(u.degreeBranch) || '—'}</span>
                                                                </td>
                                                                <td className="px-5 py-3 text-neutral-400 text-xs">{(u as any).yearOfStudy || '—'}</td>
                                                                <td className="px-5 py-3 text-neutral-400 text-xs">{(u as any).gender || '—'}</td>
                                                                <td className="px-5 py-3 font-mono text-xs text-neutral-300">{u.mobileNumber || '—'}</td>
                                                                <td className="px-5 py-3 text-xs text-neutral-400 truncate max-w-[200px]">{u.email || '—'}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {branchList.length === 0 && !overviewLoading && (
                                <div className="text-center py-20 text-neutral-500">
                                    <div className="bg-white/5 p-4 rounded-full w-fit mx-auto mb-4 border border-white/10">
                                        <Users className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <p className="font-bold text-white">No MVGR students with entry passes yet.</p>
                                    <p className="text-xs mt-1">Data will appear here as students register.</p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Entry Pass Data Table */}
                {
                    selectedEventId === 'ENTRY_PASS' && (
                        <div className="bg-zinc-900/50 rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-6 border-b border-white/5 bg-black/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-3">
                                        🎫 General Entry Passes
                                        {overviewLoading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
                                    </h3>
                                    <span className="text-xs text-neutral-500 font-mono uppercase tracking-widest mt-1 block">ID: ENTRY_PASS{branchFilter !== 'ALL' ? ` · Branch: ${branchFilter}` : ''}</span>
                                </div>
                                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold rounded-lg border border-emerald-500/20 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    {branchFilter !== 'ALL' ? `${filteredEntryPasses.length} / ${entryPassesData.length}` : entryPassesData.length} Active Passes
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-black/50 text-neutral-400 font-bold border-b border-white/10 uppercase tracking-wider text-[10px] whitespace-nowrap">
                                        <tr>
                                            <th className="px-6 py-4 w-10">#</th>
                                            <th className="px-6 py-4">Student Name</th>
                                            <th className="px-6 py-4">College</th>
                                            <th className="px-6 py-4">Contact</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {overviewLoading && entryPassesData.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-500" /></td></tr>
                                        ) : filteredEntryPasses.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-12 text-neutral-500 font-medium">
                                                {branchFilter !== 'ALL' ? `No MVGR students found for branch "${branchFilter}".` : 'No active entry passes found.'}
                                            </td></tr>
                                        ) : (
                                            filteredEntryPasses.map((user, idx) => (
                                                <tr key={user.userId || idx} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 text-neutral-600 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                            {user.fullName || 'Unknown'}
                                                        </div>
                                                        <div className="text-xs text-neutral-500 font-mono mt-0.5">{user.regNo || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-neutral-300 truncate max-w-[200px]" title={user.collegeName}>{user.collegeName || '-'}</div>
                                                        <div className="text-xs text-neutral-500 mt-0.5">{user.degreeBranch} – {user.yearOfStudy}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-neutral-300 font-mono">{user.mobileNumber || '-'}</div>
                                                        <div className="text-xs text-neutral-500 truncate max-w-[150px]" title={user.email}>{user.email || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 bg-emerald-900/30 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                                                            <CheckCircle className="w-3 h-3" /> ACTIVE
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }


                {/* Individual Event Data Table */}
                {
                    selectedEventId !== 'OVERVIEW' && selectedEventId !== 'ENTRY_PASS' && currentEvent && (
                        <div className="bg-zinc-900/50 rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-6 border-b border-white/5 bg-black/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                        {currentEvent.title}
                                        {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
                                    </h3>
                                    <span className="text-xs text-neutral-500 font-mono uppercase tracking-widest mt-1 block">ID: {currentEvent.id}</span>
                                </div>
                                <div className="px-3 py-1 bg-white/5 text-white text-xs font-mono font-bold rounded-lg border border-white/10 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-indigo-400" />
                                    {branchFilter !== 'ALL' ? `${filteredRegistrations.length} / ${registrations.length}` : registrations.length} Records
                                    {branchFilter !== 'ALL' && <span className="text-indigo-400 ml-1">· {branchFilter}</span>}
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-black/50 text-neutral-400 font-bold border-b border-white/10 uppercase tracking-wider text-[10px] whitespace-nowrap">
                                        <tr>
                                            <th className="px-6 py-4 w-10">#</th>
                                            <th className="px-6 py-4">Student</th>
                                            <th className="px-6 py-4">College</th>
                                            <th className="px-6 py-4">Contact</th>
                                            {/* Dynamic Headers */}
                                            {currentEvent.formConfig?.askTeamName && <th className="px-6 py-4 text-indigo-400">Team</th>}
                                            {currentEvent.formConfig?.askPptUrl && <th className="px-6 py-4 text-blue-400">PPT</th>}
                                            {currentEvent.formConfig?.customFields?.map((f, i) => (
                                                <th key={i} className="px-6 py-4 text-amber-400">{f.label}</th>
                                            ))}
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredRegistrations.map((reg, idx) => (
                                            <tr key={reg.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-neutral-500 text-xs font-mono">{idx + 1}</td>

                                                {/* Name & ID */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                        {reg.userSnapshot?.fullName || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-neutral-500 mt-1 font-mono">
                                                        UID: {reg.userId.slice(0, 8)}..
                                                    </div>
                                                </td>

                                                {/* College */}
                                                <td className="px-6 py-4 max-w-[200px]">
                                                    <div className="truncate text-neutral-300 font-medium">
                                                        {reg.userSnapshot?.collegeName || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
                                                        {reg.userSnapshot?.degreeBranch || 'Branch N/A'}
                                                    </div>
                                                </td>

                                                {/* Contact */}
                                                <td className="px-6 py-4">
                                                    <div className="text-neutral-300 font-mono text-xs">{reg.userSnapshot?.mobileNumber || 'N/A'}</div>
                                                    <div className="text-neutral-500 text-xs truncate max-w-[150px] mt-1" title={reg.userSnapshot?.email || ''}>
                                                        {reg.userSnapshot?.email || 'N/A'}
                                                    </div>
                                                </td>

                                                {/* Dynamic - Team */}
                                                {currentEvent.formConfig?.askTeamName && (
                                                    <td className="px-6 py-4">
                                                        {reg.responses?.teamName ? (
                                                            <span className="font-bold text-white bg-indigo-500/20 px-2 py-1 rounded text-xs border border-indigo-500/30">
                                                                {reg.responses.teamName}
                                                            </span>
                                                        ) : <span className="text-neutral-600">-</span>}
                                                    </td>
                                                )}

                                                {/* Dynamic - PPT */}
                                                {currentEvent.formConfig?.askPptUrl && (
                                                    <td className="px-6 py-4">
                                                        {reg.responses?.pptUrl ? (
                                                            <a href={reg.responses.pptUrl} target="_blank" className="flex items-center gap-1 text-blue-400 hover:text-white font-bold text-xs bg-blue-500/10 px-3 py-1.5 rounded-lg w-fit border border-blue-500/20 transition-all hover:bg-blue-500/30">
                                                                <FileText className="w-3 h-3" /> PPT
                                                            </a>
                                                        ) : <span className="text-neutral-600">-</span>}
                                                    </td>
                                                )}

                                                {/* Dynamic - Custom Fields */}
                                                {currentEvent.formConfig?.customFields?.map((f, i) => (
                                                    <td key={i} className="px-6 py-4 text-neutral-300 text-sm max-w-[200px] truncate">
                                                        {reg.responses?.[f.label] || reg.responses?.[f.id] || '-'}
                                                    </td>
                                                ))}

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    <span className={`
                                                inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest
                                                ${(reg.paymentStatus as string) === 'success' || (reg.paymentStatus as string) === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            reg.paymentStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-neutral-400 border border-white/10'}
                                            `}>
                                                        {reg.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredRegistrations.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={10} className="text-center py-20">
                                                    <div className="flex flex-col items-center justify-center text-neutral-500">
                                                        <div className="bg-white/5 p-4 rounded-full mb-4 border border-white/10">
                                                            <Filter className="w-8 h-8 text-neutral-400" />
                                                        </div>
                                                        <p className="font-bold text-white mb-1">
                                                            {branchFilter !== 'ALL' ? `No MVGR students found for branch "${branchFilter}"` : 'No registrations found'}
                                                        </p>
                                                        <p className="text-xs">
                                                            {branchFilter !== 'ALL' ? 'Try selecting a different branch or "All Branches".' : 'Data will appear here in real-time as users register.'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }
            </main>
        </div>
    );
}

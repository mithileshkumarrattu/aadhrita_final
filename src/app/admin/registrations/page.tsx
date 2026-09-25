'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event, EventRegistration } from '@/lib/db';
import { doc, getDoc, collection, getDocs, orderBy, query, limit, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Download, RefreshCw, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { EventService } from '@/services/EventService';
import { CoinLoader } from '@/components/ui/CoinLoader';

export default function AdminRegistrationsPage() {
    const { user } = useAuth();

    // State
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);

    // 1. Fetch All Events for Dropdown
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const allEvents = await EventService.getAllEvents();
                setEvents(allEvents);
                if (allEvents.length > 0) {
                    setSelectedEventId(allEvents[0].id!); // Default to first event
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

    // 2. Real-time Registrations Listener (Optimized)
    useEffect(() => {
        if (!selectedEventId) return;

        setLoading(true);

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

    if (initLoading) return <div className="p-8 flex justify-center"><CoinLoader size={48} text="Initializing Master Roster..." /></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-slate-50/50">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Registrations</h1>
                <p className="text-slate-500 mt-1">View and export data for all events across the ecosystem.</p>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Filter className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="w-full md:w-[300px]">
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-full font-bold text-slate-700">
                                <SelectValue placeholder="Select Event" />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map(ev => (
                                    <SelectItem key={ev.id} value={ev.id} className="font-medium">
                                        {ev.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => toast.info("Live updates are active")} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={downloadCSV} disabled={registrations.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                        <Download className="w-4 h-4 mr-2" /> Export Excel/CSV
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            {currentEvent && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800">{currentEvent.title}</h3>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">{currentEvent.id}</span>
                        </div>
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                            {registrations.length} Records
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-xs whitespace-nowrap">
                                <tr>
                                    <th className="px-6 py-4 w-10">#</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">College</th>
                                    <th className="px-6 py-4">Contact</th>
                                    {/* Dynamic Headers */}
                                    {currentEvent.formConfig?.askTeamName && <th className="px-6 py-4 text-indigo-600">Team</th>}
                                    {currentEvent.formConfig?.askPptUrl && <th className="px-6 py-4 text-blue-600">PPT</th>}
                                    {currentEvent.formConfig?.customFields?.map((f, i) => (
                                        <th key={i} className="px-6 py-4 text-amber-600">{f.label}</th>
                                    ))}
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registrations.map((reg, idx) => (
                                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{idx + 1}</td>

                                        {/* Name & ID */}
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {reg.userSnapshot?.fullName || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                <span title="User ID" className="font-mono bg-slate-100 px-1 rounded">{reg.userId.slice(0, 6)}..</span>
                                            </div>
                                        </td>

                                        {/* College */}
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="truncate text-slate-700" title={reg.userSnapshot?.collegeName || ''}>
                                                {reg.userSnapshot?.collegeName || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {reg.userSnapshot?.degreeBranch || 'Branch N/A'}
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 font-mono text-xs">{reg.userSnapshot?.mobileNumber || 'N/A'}</div>
                                            <div className="text-slate-400 text-xs truncate max-w-[150px]" title={reg.userSnapshot?.email || ''}>
                                                {reg.userSnapshot?.email || 'N/A'}
                                            </div>
                                        </td>

                                        {/* Dynamic - Team */}
                                        {currentEvent.formConfig?.askTeamName && (
                                            <td className="px-6 py-4">
                                                {reg.responses?.teamName ? (
                                                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded text-xs border border-indigo-100">
                                                        {reg.responses.teamName}
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        )}

                                        {/* Dynamic - PPT */}
                                        {currentEvent.formConfig?.askPptUrl && (
                                            <td className="px-6 py-4">
                                                {reg.responses?.pptUrl ? (
                                                    <a href={reg.responses.pptUrl} target="_blank" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100 transition-all hover:shadow-sm">
                                                        <FileText className="w-3 h-3" /> View PDF
                                                    </a>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        )}

                                        {/* Dynamic - Custom Fields */}
                                        {currentEvent.formConfig?.customFields?.map((f, i) => (
                                            <td key={i} className="px-6 py-4 text-slate-600 text-sm max-w-[200px] truncate">
                                                {reg.responses?.[f.label] || reg.responses?.[f.id] || '-'}
                                            </td>
                                        ))}

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span className={`
                                                inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                                ${reg.paymentStatus === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                    reg.paymentStatus === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-800'}
                                            `}>
                                                {reg.paymentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {registrations.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <div className="bg-slate-50 p-4 rounded-full mb-3">
                                                    <Filter className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <p className="font-medium">No registrations found for this event.</p>
                                                <p className="text-xs">Share the event link to get started!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event, EventRegistration } from '@/lib/db';
import { doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CoinLoader } from '@/components/ui/CoinLoader';

export default function CoordinatorEventDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { slug } = useParams(); // This is the Event ID

    const [event, setEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user || !slug) return;
        setLoading(true);

        try {
            // 1. Fetch Event
            const eventRef = doc(db, 'events', slug as string);
            const eventSnap = await getDoc(eventRef);

            if (!eventSnap.exists()) {
                toast.error("Event not found");
                router.push('/coordinator');
                return;
            }

            const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;

            // 2. Security Check
            const isCoordinator = eventData.coordinators?.includes(user.email!) || false; // || user.role === 'admin'
            if (!isCoordinator) {
                toast.error("Access Denied: You are not a coordinator for this event.");
                router.push('/coordinator');
                return;
            }

            setEvent(eventData);

            // 3. Fetch Registrations
            const regsRef = collection(db, 'events', slug as string, 'registrations');
            // Ensure index exists for createdAt desc, otherwise standard query
            const q = query(regsRef, orderBy('createdAt', 'desc'));
            const regsSnap = await getDocs(q);

            const rawRegs = regsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventRegistration));

            // Optimization: Fetch User Profiles if snapshot is missing
            // 1. Collect IDs needing fetch
            const userIdsToFetch = new Set<string>();
            rawRegs.forEach(r => {
                if (!r.userSnapshot) userIdsToFetch.add(r.userId);
            });

            const userProfiles: Record<string, any> = {};

            // 2. Batch Fetch
            const idsArray = Array.from(userIdsToFetch);
            if (idsArray.length > 0) {
                const chunkArray = (arr: any[], size: number) => {
                    const chunks = [];
                    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
                    return chunks;
                };

                const chunks = chunkArray(idsArray, 10);
                const { documentId, where } = await import('firebase/firestore');

                await Promise.all(chunks.map(async (chunk) => {
                    const usersQ = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                    const snaps = await getDocs(usersQ);
                    snaps.forEach(d => userProfiles[d.id] = d.data());
                }));
            }

            // 3. Merge
            const enrichedRegs = rawRegs.map(r => {
                if (!r.userSnapshot && userProfiles[r.userId]) {
                    // Polyfill snapshot for display compatibility
                    return {
                        ...r,
                        userSnapshot: userProfiles[r.userId]
                    } as EventRegistration;
                }
                return r;
            });

            setRegistrations(enrichedRegs);

        } catch (error) {
            console.error("Error fetching coordinator data", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, slug]);

    const downloadCSV = () => {
        if (!event || registrations.length === 0) return;

        // 1. Headers
        const headers = [
            "Registration ID",
            "Full Name",
            "Email",
            "Mobile",
            "College",
            "Year",
            "Degree/Branch",
            "Payment Status",
            "Team Name",
            "PPT URL",
            "Registered At"
        ];

        // 2. Rows
        const rows = registrations.map(reg => {
            const u = reg.userSnapshot;
            const r = reg.responses || {};

            return [
                reg.id,
                u?.fullName || 'Unknown',
                u?.email || 'N/A',
                u?.mobileNumber || 'N/A',
                u?.collegeName || 'N/A',
                // Access dynamic snapshot fields safely
                (u as any)?.yearOfStudy || '',
                (u as any)?.degreeBranch || '',
                reg.paymentStatus,
                r.teamName || '',
                r.pptUrl || '',
                reg.createdAt?.seconds ? new Date(reg.createdAt.seconds * 1000).toLocaleString() : ''
            ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','); // Escape quotes
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${event.id}_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <CoinLoader size={48} text="Gathering Attendance Data..." />
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Button variant="ghost" onClick={() => router.push('/coordinator')} className="-ml-3 mb-1 text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-900">{event.title} <span className="text-slate-400 font-normal text-lg">Registrations</span></h1>
                    <p className="text-slate-500 flex items-center gap-2 mt-1">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold uppercase">{event.category}</span>
                        <span>•</span>
                        <b className="text-slate-900">{registrations.length}</b> Students Registered
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={fetchData} title="Refresh Data">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Download CSV
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">College & Year</th>
                                <th className="px-6 py-4">Contact</th>
                                {event.formConfig?.askTeamName && <th className="px-6 py-4">Team Name</th>}
                                {event.formConfig?.askPptUrl && <th className="px-6 py-4">PPT</th>}
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No registrations found yet.
                                    </td>
                                </tr>
                            ) : (
                                registrations.map(reg => (
                                    <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{reg.userSnapshot?.fullName || 'Unknown'}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5" title={reg.id}>{reg.id?.slice(0, 8)}...</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div>{reg.userSnapshot?.collegeName || 'N/A'}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {(reg.userSnapshot as any)?.yearOfStudy ? `${(reg.userSnapshot as any).yearOfStudy} Year` : 'N/A'} • {(reg.userSnapshot as any)?.degreeBranch || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 space-y-0.5">
                                            <div className="text-slate-600">{reg.userSnapshot?.mobileNumber || 'N/A'}</div>
                                            <div className="text-slate-400 text-xs">{(reg.userSnapshot as any)?.email || 'N/A'}</div>
                                        </td>
                                        {event.formConfig?.askTeamName && (
                                            <td className="px-6 py-4 font-medium text-indigo-600">
                                                {reg.responses?.teamName || '-'}
                                            </td>
                                        )}
                                        {event.formConfig?.askPptUrl && (
                                            <td className="px-6 py-4">
                                                {reg.responses?.pptUrl ? (
                                                    <a href={reg.responses.pptUrl} target="_blank" className="text-blue-500 hover:underline text-xs">View PPT</a>
                                                ) : '-'}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`
                                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${reg.paymentStatus === 'success' ? 'bg-green-100 text-green-800' :
                                                    reg.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}
                                            `}>
                                                {reg.paymentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

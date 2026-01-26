'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, COLLECTIONS } from '@/lib/db';
import { collection, getDocs, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Download, Table as TableIcon, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { toast } from 'sonner';

export default function AdminHackathonPage() {
    const { userProfile, loading } = useAuth();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = async () => {
        if (!userProfile || userProfile.role !== 'admin') return;
        setFetching(true);
        try {
            // Updated to use consistent collection name
            const q = query(collection(db, 'hackathon_teams'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().createdAt?.toDate?.().toISOString() || doc.data().createdAt || 'N/A'
            }));
            setRegistrations(data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch teams");
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            fetchData();
        }
    }, [userProfile, loading]);

    const updateStatus = async (teamId: string, newStatus: 'approved' | 'rejected') => {
        setActionLoading(teamId);
        try {
            await updateDoc(doc(db, 'hackathon_teams', teamId), {
                status: newStatus
            });
            toast.success(`Team ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`);
            // Optimistic Update
            setRegistrations(prev => prev.map(r => r.id === teamId ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    const downloadCSV = () => {
        if (registrations.length === 0) return;

        // Expanded Headers
        const headers = [
            'Team Name', 'Team Size', 'Status', 'Payment Status', 'Submitted At',
            'College Name', 'College City', 'College State',
            'Leader Name', 'Leader RegNo', 'Leader Email', 'Leader Phone', 'Leader Dept', 'Leader Year', 'Leader ID URL',
            'Member 2 Name', 'Member 2 RegNo', 'Member 2 Email', 'Member 2 Phone', 'Member 2 Dept', 'Member 2 Year', 'Member 2 ID URL',
            'Member 3 Name', 'Member 3 RegNo', 'Member 3 Email', 'Member 3 Phone', 'Member 3 Dept', 'Member 3 Year', 'Member 3 ID URL',
            'Member 4 Name', 'Member 4 RegNo', 'Member 4 Email', 'Member 4 Phone', 'Member 4 Dept', 'Member 4 Year', 'Member 4 ID URL',
            'PPT Title', 'PPT URL',
            'Communication', 'Emergency Contact', 'Referral Source'
        ];

        const csvContent = [
            headers.join(','),
            ...registrations.map(reg => {
                // Helpers to safely get nested data
                const l = reg.leader || {};
                const m2 = reg.members?.[0] || {};
                const m3 = reg.members?.[1] || {};
                const m4 = reg.members?.[2] || {}; // Member 4 if exists

                const row = [
                    reg.teamName, reg.teamSize, reg.status, reg.paymentStatus || 'pending', reg.submittedAt,
                    reg.collegeName, reg.collegeCity, reg.collegeState,
                    l.name, l.regNo, l.email, l.phone, l.dept, l.year, l.idCardUrl || 'N/A',
                    m2.name, m2.regNo, m2.email, m2.phone, m2.dept, m2.year, m2.idCardUrl || 'N/A',
                    m3.name, m3.regNo, m3.email, m3.phone, m3.dept, m3.year, m3.idCardUrl || 'N/A',
                    m4.name, m4.regNo, m4.email, m4.phone, m4.dept, m4.year, m4.idCardUrl || 'N/A',
                    reg.pptTitle, reg.pptUrl,
                    reg.communicationChannel, reg.emergencyContact, reg.referralSource
                ];

                return row.map(value => {
                    let str = String(value || '');
                    str = str.replace(/"/g, '""'); // Escape quotes
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        str = `"${str}"`;
                    }
                    return str;
                }).join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'hackathon_registrations.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">Hackathon Entries <span className="text-xl bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">🏆</span></h1>
                    <p className="text-slate-500">View, evaluate, and approve teams for the Grand Finale.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={fetching} className="border-slate-300">
                        <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2">
                        <Download className="w-4 h-4" />
                        Export Full CSV
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-700 flex items-center gap-2">
                        <TableIcon className="w-4 h-4" />
                        Total Entries: {registrations.length}
                    </div>
                </div>

                {fetching ? (
                    <div className="flex h-64 items-center justify-center">
                        <CoinLoader text="Fetching Data..." />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3">Team</th>
                                    <th className="px-6 py-3">Lead</th>
                                    <th className="px-6 py-3">PPT</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Payment</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.length > 0 ? (
                                    registrations.map((reg) => (
                                        <tr key={reg.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{reg.teamName}</div>
                                                <div className="text-xs text-slate-500">Size: {reg.teamSize} | {reg.collegeName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{reg.leader?.name}</div>
                                                <div className="text-xs text-slate-500">{reg.leader?.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {reg.pptUrl ? (
                                                    <a href={reg.pptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-xs">View PPT</a>
                                                ) : <span className="text-slate-400 italic text-xs">Pending</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reg.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {reg.paymentStatus || 'pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {reg.status !== 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 h-8"
                                                            onClick={() => updateStatus(reg.id, 'approved')}
                                                            disabled={actionLoading === reg.id}
                                                        >
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                                        </Button>
                                                    )}
                                                    {reg.status !== 'rejected' && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="h-8"
                                                            onClick={() => updateStatus(reg.id, 'rejected')}
                                                            disabled={actionLoading === reg.id}
                                                        >
                                                            <XCircle className="w-3 h-3 mr-1" /> Reject
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <TableIcon className="w-8 h-8 opacity-20" />
                                                <p>No registrations found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, COLLECTIONS } from '@/lib/db';
import { collection, getDocs, orderBy, query, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Table as TableIcon, RefreshCw, CheckCircle, XCircle, BedDouble, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { toast } from 'sonner';

export default function AdminHackathonPage() {
    const { userProfile, loading } = useAuth();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // --- Manual Recovery Panel State ---
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryTeamId, setRecoveryTeamId] = useState('');
    const [recoveryTxnId, setRecoveryTxnId] = useState('');
    const [recovering, setRecovering] = useState(false);

    const fetchData = async () => {
        if (!userProfile || userProfile.role !== 'admin') return;
        setFetching(true);
        try {
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
            setRegistrations(prev => prev.map(r => r.id === teamId ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    // --- Manual Recovery Handler ---
    // Finds the team in hackathon_teams (or reg_hackathon), marks it paid,
    // and generates hackathon_passes documents exactly like the payment callback does.
    const handleManualRecovery = async () => {
        if (!recoveryTeamId.trim()) { toast.error('Enter a Team Document ID'); return; }
        if (!recoveryTxnId.trim()) { toast.error('Enter a Transaction ID'); return; }
        setRecovering(true);

        const crypto = require('crypto');

        try {
            // 1. Find team — try hackathon_teams first, then reg_hackathon
            let teamDocRef: any = null;
            let teamData: any = null;
            let teamCollection = 'hackathon_teams';

            const snap1 = await getDoc(doc(db, 'hackathon_teams', recoveryTeamId.trim()));
            if (snap1.exists()) {
                teamDocRef = snap1.ref;
                teamData = snap1.data();
            } else {
                const snap2 = await getDoc(doc(db, 'reg_hackathon', recoveryTeamId.trim()));
                if (snap2.exists()) {
                    teamDocRef = snap2.ref;
                    teamData = snap2.data();
                    teamCollection = 'reg_hackathon';
                }
            }

            if (!teamDocRef || !teamData) {
                toast.error(`Team "${recoveryTeamId}" not found in hackathon_teams or reg_hackathon`);
                setRecovering(false);
                return;
            }

            // 2. Skip if already processed (idempotency guard)
            if (teamData.paymentStatus === 'paid' && teamData.passTokens?.length > 0) {
                toast.warning(`Team "${teamData.teamName}" already has passes. No changes made.`);
                setRecovering(false);
                return;
            }

            // 3. Mark team as paid
            await updateDoc(teamDocRef, {
                paymentStatus: 'paid',
                transactionId: recoveryTxnId.trim(),
                paidAt: new Date().toISOString(),
                manuallyRecoveredAt: new Date().toISOString(),
                manuallyRecoveredBy: userProfile?.email || 'admin',
            });

            // 4. Generate pass tokens for all members (same logic as callback)
            const allMembers = [
                { ...teamData.leader, isLeader: true },
                ...(teamData.members || []).map((m: any) => ({ ...m, isLeader: false }))
            ];

            const passTokens: { name: string; token: string; isLeader: boolean }[] = [];

            for (const member of allMembers) {
                const token = crypto.randomBytes(12).toString('hex');
                passTokens.push({ name: member.name, token, isLeader: member.isLeader });

                await addDoc(collection(db, 'hackathon_passes'), {
                    token,
                    teamId: recoveryTeamId.trim(),
                    teamCollection,
                    teamName: teamData.teamName,
                    memberName: member.name,
                    memberRegNo: member.regNo || '',
                    memberEmail: member.email || '',
                    memberPhone: member.phone || '',
                    memberIdCardUrl: member.idCardUrl || '',
                    isLeader: member.isLeader,
                    accommodation: member.accommodation || { mar11: false, mar13: false },
                    collegeName: teamData.collegeName || '',
                    manuallyGenerated: true,
                    createdAt: new Date().toISOString()
                });
            }

            // 5. Save tokens to team doc
            await updateDoc(teamDocRef, { passTokens });

            toast.success(`✅ Recovery complete! ${passTokens.length} passes generated for "${teamData.teamName}"`);
            setRecoveryTeamId('');
            setRecoveryTxnId('');
            fetchData(); // Refresh the table
        } catch (err: any) {
            console.error('[ManualRecovery]', err);
            toast.error(`Recovery failed: ${err.message || 'Unknown error'}`);
        } finally {
            setRecovering(false);
        }
    };

    const downloadCSV = () => {
        if (registrations.length === 0) return;

        const headers = [
            'Team Name', 'Team Size', 'Status', 'Payment Status', 'Transaction ID', 'Submitted At',
            'College Name', 'College City', 'College State',
            'Leader Name', 'Leader RegNo', 'Leader Email', 'Leader Phone', 'Leader Dept', 'Leader Year', 'Leader ID URL', 'Leader Accom',
            'Member 2 Name', 'Member 2 RegNo', 'Member 2 Email', 'Member 2 Phone', 'Member 2 Dept', 'Member 2 Year', 'Member 2 ID URL', 'Member 2 Accom',
            'Member 3 Name', 'Member 3 RegNo', 'Member 3 Email', 'Member 3 Phone', 'Member 3 Dept', 'Member 3 Year', 'Member 3 ID URL', 'Member 3 Accom',
            'Member 4 Name', 'Member 4 RegNo', 'Member 4 Email', 'Member 4 Phone', 'Member 4 Dept', 'Member 4 Year', 'Member 4 ID URL', 'Member 4 Accom',
            'PPT Title', 'PPT URL',
            'Communication', 'Emergency Contact', 'Referral Source'
        ];

        const csvContent = [
            headers.join(','),
            ...registrations.map(reg => {
                const l = reg.leader || {};
                const m2 = reg.members?.[0] || {};
                const m3 = reg.members?.[1] || {};
                const m4 = reg.members?.[2] || {};

                const getAccomStr = (m: any) => {
                    if (!m?.accommodation) return 'No';
                    const days = [];
                    if (m.accommodation.mar11) days.push('Mar 11');
                    if (m.accommodation.mar13) days.push('Mar 13');
                    return days.length > 0 ? days.join(' & ') : 'No';
                };

                const row = [
                    reg.teamName, reg.teamSize, reg.status, reg.paymentStatus || 'pending', reg.transactionId || 'N/A', reg.submittedAt,
                    reg.collegeName, reg.collegeCity, reg.collegeState,
                    l.name, l.regNo, l.email, l.phone, l.dept, l.year, l.idCardUrl || 'N/A', getAccomStr(l),
                    m2.name, m2.regNo, m2.email, m2.phone, m2.dept, m2.year, m2.idCardUrl || 'N/A', getAccomStr(m2),
                    m3.name, m3.regNo, m3.email, m3.phone, m3.dept, m3.year, m3.idCardUrl || 'N/A', getAccomStr(m3),
                    m4.name, m4.regNo, m4.email, m4.phone, m4.dept, m4.year, m4.idCardUrl || 'N/A', getAccomStr(m4),
                    reg.pptTitle, reg.pptUrl,
                    reg.communicationChannel, reg.emergencyContact, reg.referralSource
                ];

                return row.map(value => {
                    let str = String(value || '');
                    str = str.replace(/"/g, '""');
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
                    <Button variant="outline" onClick={() => setShowRecovery(v => !v)} className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2">
                        <Wrench className="w-4 h-4" />
                        Manual Recovery
                        {showRecovery ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
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

            {/* ── Manual Payment Recovery Panel ── */}
            {showRecovery && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-orange-600" />
                        <h2 className="font-bold text-orange-800 text-lg">Manual Payment Recovery</h2>
                    </div>
                    <p className="text-sm text-orange-700">
                        Use this when a team paid but got "Payment Failed" on their screen. Enter the Firestore <b>Team Document ID</b> (not team name) and the <b>Paytm Transaction ID</b>. This will mark them as paid and generate all hackathon passes — exactly like the automatic payment callback does.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-orange-800 uppercase tracking-wider">Team Document ID (Firestore)</label>
                            <Input
                                placeholder="e.g. xYz8AbC3pQ..."
                                value={recoveryTeamId}
                                onChange={e => setRecoveryTeamId(e.target.value)}
                                className="border-orange-200 bg-white font-mono text-sm"
                            />
                            <p className="text-[10px] text-orange-500">Find this in Firebase Console → hackathon_teams → the document ID in grey</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-orange-800 uppercase tracking-wider">Paytm Transaction ID (TXNID)</label>
                            <Input
                                placeholder="e.g. 20250224111315800110168..."
                                value={recoveryTxnId}
                                onChange={e => setRecoveryTxnId(e.target.value)}
                                className="border-orange-200 bg-white font-mono text-sm"
                            />
                            <p className="text-[10px] text-orange-500">Get this from Paytm merchant dashboard or the payment_issues collection</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleManualRecovery}
                            disabled={recovering || !recoveryTeamId.trim() || !recoveryTxnId.trim()}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2"
                        >
                            {recovering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {recovering ? 'Processing...' : 'Mark Paid & Generate Passes'}
                        </Button>
                        <span className="text-xs text-orange-600">⚡ Idempotent — safe to run if already processed (will skip)</span>
                    </div>
                </div>
            )}

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
                                    <th className="px-6 py-3">Acc.</th>
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
                                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{reg.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{reg.leader?.name}</div>
                                                <div className="text-xs text-slate-500">{reg.leader?.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    let mar11Count = 0;
                                                    let mar13Count = 0;
                                                    let totalPeople = 0;

                                                    const check = (accom: any) => {
                                                        if (accom?.mar11 || accom?.mar13) {
                                                            totalPeople++;
                                                            if (accom.mar11) mar11Count++;
                                                            if (accom.mar13) mar13Count++;
                                                        }
                                                    };

                                                    check(reg.leader?.accommodation);
                                                    reg.members?.forEach((m: any) => check(m.accommodation));

                                                    if (totalPeople === 0) return <span className="text-xs text-slate-400">-</span>;

                                                    return (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit">
                                                                <BedDouble className="w-3 h-3" /> {totalPeople} / {reg.teamSize}
                                                            </span>
                                                            <div className="text-[10px] text-slate-500 font-medium flex gap-1 flex-wrap">
                                                                {mar11Count > 0 && <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 rounded whitespace-nowrap">11th: {mar11Count}</span>}
                                                                {mar13Count > 0 && <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 rounded whitespace-nowrap">13th: {mar13Count}</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
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
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${reg.paymentStatus === 'paid' || reg.paymentStatus === 'success'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {reg.paymentStatus || 'pending'}
                                                </span>
                                                {reg.transactionId && reg.transactionId !== 'N/A' && (
                                                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 max-w-[100px] truncate" title={reg.transactionId}>{reg.transactionId}</div>
                                                )}
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
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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

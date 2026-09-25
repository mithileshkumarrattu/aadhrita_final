'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS, UserRegistration } from '@/lib/db';
import { loginStaff, setStaffSession, getStaffSession, clearStaffSession, StaffSession } from '@/lib/staff-auth';
import { CheckCircle, XCircle, Search, RefreshCw, Lock, Download, LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CoinLoader } from '@/components/ui/CoinLoader';

export default function EntryPassDashboard() {
    const [session, setSession] = useState<StaffSession | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserRegistration[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserRegistration[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAccom, setFilterAccom] = useState<'all' | 'yes' | 'no'>('all');
    const [stats, setStats] = useState<{ total: number; accommodation: number; activePasses: number; eventCounts?: Record<string, number> }>({ total: 0, accommodation: 0, activePasses: 0, eventCounts: {} });
    const [eventsMap, setEventsMap] = useState<Record<string, string>>({}); // ID -> Title mapping

    // Restore session on mount
    useEffect(() => {
        const existing = getStaffSession();
        if (existing && existing.role === 'entrypass_viewer') {
            setSession(existing);
        }
    }, []);

    // Load all data in one pass — users, transactions, and events in parallel
    const loadData = React.useCallback(async () => {
        if (!session) return;
        setLoading(true);

        try {
            const qUsers = query(collection(db, COLLECTIONS.USERS), where('hasEntryPass', '==', true));
            const qTxns = query(collection(db, 'transactions'), where('status', '==', 'SUCCESS'));
            const qEvents = collection(db, COLLECTIONS.EVENTS);

            // Fetch all three in parallel
            const [usersSnap, txnsSnap, eventsSnap] = await Promise.all([
                getDocs(qUsers),
                getDocs(qTxns),
                getDocs(qEvents),
            ]);

            // Build events map
            const mapping: Record<string, string> = { 'HACKATHON': 'Grand Finale Hackathon' };
            eventsSnap.docs.forEach(doc => {
                mapping[doc.id] = doc.data().title || doc.id;
            });
            setEventsMap(mapping);

            // Build transactions map
            const txnsMap = new Map();
            txnsSnap.docs.forEach(doc => {
                const txn = doc.data();
                if (txn.userId) txnsMap.set(txn.userId, txn);
            });

            // Process users: filter FreeFire + enrich with txn data
            const fetchedUsers = usersSnap.docs.map(d => ({ ...d.data(), userId: d.id } as UserRegistration));
            const processed = fetchedUsers
                .filter(u => {
                    // Filter out legacy FreeFire entries that incorrectly got hasEntryPass=true
                    const txn = txnsMap.get(u.userId);
                    if (txn?.orderId?.startsWith('FF-')) return false;
                    return true;
                })
                .map(u => {
                    const txn = txnsMap.get(u.userId);
                    if (txn) {
                        return {
                            ...u,
                            paymentDetails: u.paymentDetails || {
                                amount: parseFloat(txn.amount) || 0,
                                currency: "INR",
                                orderId: txn.orderId,
                                txnId: txn.paytmTxnId || txn.orderId,
                                paymentDate: txn.updatedAt || txn.createdAt,
                                eventsBreakdown: (txn.eventIds || []).map((eid: string) => ({ eventId: eid, name: eid }))
                            },
                            registeredEventIds: u.registeredEventIds?.length ? u.registeredEventIds : (txn.eventIds || [])
                        };
                    }
                    return u;
                });

            setUsers(processed);
        } catch (error) {
            console.error('[EntryPass] loadData error:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [session]);

    // Load on mount (when session arrives)
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Stats Effect (depend on users)
    useEffect(() => {
        const total = users.length;
        const accom = users.filter(u => u.accommodationRequired).length;

        // Calculate Event Breakdown
        const counts: Record<string, number> = {};
        users.forEach(u => {
            u.registeredEventIds?.forEach(eid => {
                const name = eventsMap[eid] || eid;
                counts[name] = (counts[name] || 0) + 1;
            });
        });

        setStats({ total, accommodation: accom, activePasses: total, eventCounts: counts } as any);
    }, [users, eventsMap]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        try {
            const result = await loginStaff(username, password);
            if (result.success && result.session) {
                if (result.session.role !== 'entrypass_viewer') {
                    toast.error("Access Denied: This account does not have Entry Pass Viewer access.");
                    setLoginLoading(false);
                    return;
                }
                setStaffSession(result.session);
                setSession(result.session);
                toast.success(`Welcome, ${result.session.username}`);
            } else {
                toast.error(result.error || "Login Failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Login Error");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        clearStaffSession();
        setSession(null);
        setUsers([]);
        setFilteredUsers([]);
        toast.info("Logged out");
    };

    // Manual refresh — re-fetches all data
    const fetchData = () => {
        loadData();
        toast.success("Refreshing data...");
    };

    // Search + Filter
    useEffect(() => {
        let result = users;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.fullName?.toLowerCase().includes(lower) ||
                u.regNo?.toLowerCase().includes(lower) ||
                u.email?.toLowerCase().includes(lower) ||
                u.mobileNumber?.includes(lower)
            );
        }

        if (filterAccom === 'yes') result = result.filter(u => u.accommodationRequired);
        if (filterAccom === 'no') result = result.filter(u => !u.accommodationRequired);

        setFilteredUsers(result);
    }, [searchTerm, filterAccom, users]);

    // --- Login Screen ---
    if (!session) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-neutral-900 border border-white/10 p-8 rounded-2xl max-w-sm w-full space-y-6">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                            <Lock className="w-6 h-6 text-red-500" />
                        </div>
                        <h1 className="text-xl font-bold text-white">Entry Pass Dashboard</h1>
                        <p className="text-neutral-500 text-sm mt-1">Staff credentials required</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">Staff ID</label>
                        <Input
                            placeholder="Enter Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="bg-black/50 border-white/10 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">Password</label>
                        <Input
                            type="password"
                            placeholder="•••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="bg-black/50 border-white/10 text-white"
                        />
                    </div>
                    <Button type="submit" disabled={loginLoading} className="w-full bg-red-600 hover:bg-red-700 font-bold text-white">
                        {loginLoading ? <CoinLoader size={16} /> : 'Sign In'}
                    </Button>
                    <p className="text-[10px] text-neutral-600 text-center">Credentials are created in Admin → Staff Management</p>
                </form>
            </div>
        );
    }

    // --- Dashboard ---
    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Entry Pass <span className="text-red-600">Masterlist</span></h1>
                        <p className="text-neutral-400">Logged in as <span className="text-white font-bold">{session.username}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchData} disabled={loading} variant="outline" className="border-white/10 text-neutral-300 hover:bg-white/5">
                            <span className="mr-2">
                                {loading ? <CoinLoader size={16} /> : <RefreshCw className="w-4 h-4" />}
                            </span>
                            Refresh
                        </Button>
                        <Button onClick={handleLogout} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl">
                        <p className="text-sm text-neutral-500 font-bold uppercase">Total Users</p>
                        <p className="text-4xl font-black text-white mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl">
                        <p className="text-sm text-neutral-500 font-bold uppercase">Accommodation</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-4xl font-black text-amber-500">{stats.accommodation}</p>
                            <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded text-xs font-bold">
                                {stats.total > 0 ? (stats.accommodation / stats.total * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                    <div className="bg-neutral-900/50 border border-white/10 p-6 rounded-2xl">
                        <p className="text-sm text-neutral-500 font-bold uppercase">Active Passes</p>
                        <p className="text-4xl font-black text-green-500 mt-1">{stats.activePasses}</p>
                    </div>
                    <div className="bg-neutral-900/50 border border-white/10 p-4 rounded-2xl overflow-hidden">
                        <p className="text-xs text-neutral-500 font-bold uppercase mb-2">Event Breakdown</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {Object.entries(stats.eventCounts || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([evt, count]) => (
                                <div key={evt} className="flex justify-between text-xs">
                                    <span className="text-neutral-400 truncate max-w-[120px]" title={evt}>{evt}</span>
                                    <span className="text-white font-mono">{count as number}</span>
                                </div>
                            ))}
                            {Object.keys(stats.eventCounts || {}).length === 0 && <span className="text-neutral-600 text-xs italic">No event data</span>}
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-neutral-900/30 p-4 rounded-xl border border-white/5">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <Input
                            placeholder="Search by Name, RegNo, Phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 bg-black/50 border-white/10 text-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'yes', 'no'] as const).map(v => (
                            <Button
                                key={v}
                                variant={filterAccom === v ? 'default' : 'outline'}
                                size="sm"
                                className={filterAccom === v
                                    ? 'bg-amber-600 text-white'
                                    : 'border-white/10 text-neutral-400'}
                                onClick={() => setFilterAccom(v)}
                            >
                                {v === 'all' ? 'All' : v === 'yes' ? 'Accom ✓' : 'No Accom'}
                            </Button>
                        ))}
                        <Button variant="outline" className="border-white/10 text-neutral-400" onClick={() => {
                            const csvHeader = "Name,RegNo,Email,Phone,College,Degree,Year,Accommodation,Dates,Status,Amount,Events,TxnID\n";
                            const csvRows = filteredUsers.map(u => {
                                const eventNames = (u.registeredEventIds || []).map(id => eventsMap[id] || id).join('; ');
                                return `"${u.fullName || ''}","${u.regNo || ''}","${u.email || ''}","${u.mobileNumber || ''}","${u.collegeName || ''}","${u.degreeBranch || ''}","${u.yearOfStudy || ''}","${u.accommodationRequired ? 'Yes' : 'No'}","${(u.accommodationDates || []).join('; ')}","${u.hasEntryPass ? 'Active' : 'Pending'}","${u.paymentDetails?.amount || 0}","${eventNames}","${u.paymentDetails?.txnId || ''}"`;
                            }).join('\n');
                            const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = 'entrypass_masterlist.csv'; a.click();
                        }}>
                            <Download className="w-4 h-4 mr-2" /> CSV
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="rounded-xl border border-white/10 overflow-hidden bg-neutral-900/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-neutral-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">#</th>
                                    <th className="px-6 py-4">Student Details</th>
                                    <th className="px-6 py-4">College Info</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Payment Info</th>
                                    <th className="px-6 py-4 text-center">Accommodation</th>
                                    <th className="px-6 py-4 text-center">Pass Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={7} className="p-10 text-center"><CoinLoader text="Accessing Global Roster..." /></td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={7} className="p-10 text-center text-neutral-500">No records found.</td></tr>
                                ) : (
                                    filteredUsers.map((user, idx) => (
                                        <tr key={user.userId} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-neutral-600 font-mono text-xs">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    {user.fullName || 'N/A'}
                                                    {user.idCardUrl && (
                                                        <a
                                                            href={user.idCardUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-neutral-400 hover:text-blue-400 transition-colors"
                                                            title="View ID Card"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-neutral-500 text-xs">{user.regNo || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-300">
                                                <div className="truncate max-w-[200px]" title={user.collegeName}>{user.collegeName || '-'}</div>
                                                <div className="text-xs text-neutral-500">{user.degreeBranch} – {user.yearOfStudy}</div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-300">
                                                <div>{user.mobileNumber}</div>
                                                <div className="text-xs text-neutral-500 truncate max-w-[150px]" title={user.email}>{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        {user.registeredEventIds && user.registeredEventIds.length > 0 ? (
                                                            <span className="text-xs font-bold text-white">{user.registeredEventIds.length} {user.registeredEventIds.length === 1 ? 'Event' : 'Events'}</span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-white">General Entry Pass</span>
                                                        )}
                                                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20 uppercase font-bold">PAID</span>
                                                        {user.paymentDetails?.amount && (
                                                            <span className="text-[10px] font-mono text-neutral-400">₹{user.paymentDetails.amount}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-400 max-w-[180px] break-words leading-tight" title={user.registeredEventIds?.map(id => eventsMap[id] || id).join(', ')}>
                                                        {user.registeredEventIds?.map(id => eventsMap[id] || id).join(', ') || 'General Entry'}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                                                            <CheckCircle className="w-3 h-3 text-green-500/50" />
                                                            <span>Txn: {user.paymentDetails?.txnId || user.paymentStatus === 'success' ? 'Verified' : 'Manual/Legacy'}</span>
                                                        </div>
                                                        {user.paymentDetails?.paymentDate && (
                                                            <div className="text-[9px] text-zinc-700 pl-4">
                                                                {new Date(user.paymentDetails.paymentDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user.accommodationRequired ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded text-xs mb-1">Yes</span>
                                                        <span className="text-[10px] text-neutral-500">{user.accommodationDates?.length || 0} Days</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-neutral-600 font-bold text-xs">–</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user.hasEntryPass ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-500/30">
                                                        <CheckCircle className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/30">
                                                        <XCircle className="w-3 h-3" /> Pending
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Footer Count */}
                    <div className="bg-white/5 px-6 py-3 text-xs text-neutral-500 flex justify-between">
                        <span>Showing {filteredUsers.length} of {users.length} records</span>
                        <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

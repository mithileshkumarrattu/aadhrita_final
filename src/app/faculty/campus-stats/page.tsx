'use client';

import * as React from 'react';
import { db, COLLECTIONS } from '@/lib/db';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Search, FileDown, CheckCircle2, XCircle, Gift, LogOut } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { clearStaffSession } from '@/lib/staff-auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function CampusStatsPage() {
    const router = useRouter();
    const [users, setUsers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');

    React.useEffect(() => {
        // Fetch all unique users who have an entry pass
        const q = query(
            collection(db, COLLECTIONS.USERS),
            where('hasEntryPass', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(userData);
            setLoading(false);
        }, (err) => {
            console.error(err);
            toast.error("Failed to sync campus data.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredUsers = React.useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return users.filter(u => 
            u.fullName?.toLowerCase().includes(lowerSearch) ||
            (u.regNo || u.registrationNumber)?.toLowerCase().includes(lowerSearch) ||
            u.collegeName?.toLowerCase().includes(lowerSearch)
        ).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    }, [users, search]);

    const handleExport = () => {
        if (filteredUsers.length === 0) return;
        
        const data = filteredUsers.map(u => ({
            "Full Name": u.fullName,
            "Reg No": u.regNo || u.registrationNumber,
            "College": u.collegeName || u.college || 'MVGR',
            "Branch": u.branch || u.degreeBranch || '-',
            "Entered Campus": u.hasEntered ? 'YES' : 'NO',
            "Kit Status": u.hasReceivedWelcomeKit ? 'RECEIVED' : (u.kitHandoverLoggedBySecurity ? 'HANDOVER LOGGED' : 'PENDING'),
            "Email": u.email,
            "Phone": u.mobileNumber
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Campus_Stats");
        XLSX.writeFile(wb, "Campus_Entry_Kit_Stats.xlsx");
        toast.success("Stats exported successfully");
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/faculty');
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><CoinLoader text="Aggregating Campus Stats..." /></div>;

    const stats = {
        total: users.length,
        entered: users.filter(u => u.hasEntered).length,
        kits: users.filter(u => u.hasReceivedWelcomeKit).length
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none">Campus Management</h1>
                            <p className="text-[10px] text-neutral-500 font-mono mt-1 uppercase tracking-wider text-cyan-500/80">Entry & Kit Tracking</p>
                        </div>
                    </div>

                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-white hover:bg-red-500/20">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-zinc-500 uppercase">Total Valid Passes</p>
                            <p className="text-3xl font-black mt-2">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-zinc-500 uppercase text-green-500">Currently in Campus</p>
                            <p className="text-3xl font-black mt-2 text-green-500">{stats.entered}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-zinc-500 uppercase text-cyan-400">Kits Handed Over</p>
                            <p className="text-3xl font-black mt-2 text-cyan-400">{stats.kits}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Action Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-40 bg-zinc-950/80 backdrop-blur-sm p-2 rounded-xl">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input 
                            placeholder="Search Name or Registration Number..." 
                            className="pl-10 bg-black/50 border-zinc-800 focus:border-cyan-500/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleExport} variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white w-full md:w-auto">
                        <FileDown className="w-4 h-4 mr-2" /> Export to Excel
                    </Button>
                </div>

                {/* Table */}
                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/50 text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4">Participant</th>
                                    <th className="px-6 py-4">Institution</th>
                                    <th className="px-6 py-4">Campus Entry</th>
                                    <th className="px-6 py-4">Welcome Kit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">{u.fullName}</span>
                                                <span className="text-xs font-mono text-zinc-500 tracking-tighter">{u.regNo || u.registrationNumber || 'GOOGLE_USER'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="text-zinc-300 font-medium truncate max-w-[200px]">{u.collegeName || u.college || 'MVGR'}</div>
                                                <div className="text-[10px] text-zinc-600 uppercase font-bold">{u.branch || u.degreeBranch || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.hasEntered ? (
                                                <div className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 w-fit">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">In Campus</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-zinc-600 px-3 py-1">
                                                    <XCircle className="w-3.5 h-3.5 opacity-30" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Pending</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.hasReceivedWelcomeKit ? (
                                                <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 w-fit">
                                                    <Gift className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Received</span>
                                                </div>
                                            ) : u.kitHandoverLoggedBySecurity ? (
                                                <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 w-fit">
                                                    <Gift className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest italic">Kit at Desk</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-zinc-600 px-3 py-1">
                                                    <XCircle className="w-3.5 h-3.5 opacity-30" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Not Handed</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="p-12 text-center text-zinc-500 italic font-mono uppercase tracking-widest text-xs">
                                No matching records found in database
                            </div>
                        )}
                    </div>
                </Card>
            </main>
        </div>
    );
}

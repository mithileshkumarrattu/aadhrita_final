'use client';

import * as React from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, UserRegistration } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Loader2, Download, Search, RefreshCw, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { UserProfile, useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AdminEntryPassPage() {
    const { userProfile } = useAuth();
    const [users, setUsers] = React.useState<UserProfile[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [syncing, setSyncing] = React.useState(false);
    const [entryLogs, setEntryLogs] = React.useState<any[]>([]);
    const [entryStats, setEntryStats] = React.useState({ uniqueCount: 0 });

    // Fetch Users with Entry Pass
    React.useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.USERS),
            where('hasEntryPass', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers: UserProfile[] = [];
            snapshot.forEach((doc) => {
                fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });
            // Client-side sort by createdAt descending
            fetchedUsers.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setUsers(fetchedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching entry pass users:", error);
            toast.error("Failed to fetch data");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch Unique Entry Logs
    React.useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.ACCESS_LOGS),
            where('scanType', 'in', ['ENTRY', 'ADMIN_ENTRY'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEntryLogs(logs);
            
            // Calculate Unique User IDs
            const uniqueUIDs = new Set(logs.map((l: any) => l.userId));
            setEntryStats({ uniqueCount: uniqueUIDs.size });
        }, (error) => {
            console.error("Error fetching access logs:", error);
        });

        return () => unsubscribe();
    }, []);

    const filteredUsers = React.useMemo(() => {
        if (!searchQuery.trim()) return users;
        const lower = searchQuery.toLowerCase();
        return users.filter(u =>
            u.fullName?.toLowerCase().includes(lower) ||
            u.registrationNumber?.toLowerCase().includes(lower) ||
            u.email?.toLowerCase().includes(lower) ||
            u.mobileNumber?.includes(lower)
        );
    }, [users, searchQuery]);

    const handleExport = () => {
        if (filteredUsers.length === 0) {
            toast.error("No data to export");
            return;
        }

        const dataToExport = filteredUsers.map(u => ({
            "Full Name": u.fullName,
            "Reg No": u.registrationNumber,
            "Email": u.email,
            "Phone": u.mobileNumber,
            "Gender": u.gender,
            "College": u.collegeName,
            "Branch": u.branch || u.department,
            "Year": u.yearOfStudy,
            "City/State": u.cityState,
            "Has Pass": "YES",
            "User ID": u.uid
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "Entry Pass Holders");
        XLSX.writeFile(wb, `EntryPass_Holders_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully");
    };

    const handleExportEntered = () => {
        if (entryLogs.length === 0) {
            toast.error("No entry data to export");
            return;
        }

        const uniqueUIDs = new Set(entryLogs.map((l: any) => l.userId));
        const enteredUsers = users.filter(u => uniqueUIDs.has(u.uid));

        if (enteredUsers.length === 0) {
            toast.error("No profiled users found in entry logs");
            return;
        }

        const dataToExport = enteredUsers.map(u => ({
            "Full Name": u.fullName,
            "Reg No": u.registrationNumber,
            "Email": u.email,
            "Phone": u.mobileNumber,
            "College": u.collegeName,
            "Branch": u.branch || u.department,
            "Year": u.yearOfStudy,
            "Entry Status": "ENTERED",
            "User ID": u.uid
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "Campus Entries");
        XLSX.writeFile(wb, `Campus_Entries_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported entries successfully");
    };

    // --- MIGRATION TOOL ---
    const handleSyncLegacy = async () => {
        if (!confirm("This will scan the 'registrations' collection for successful payments and ensure 'hasEntryPass: true' is set in the 'users' collection. Continue?")) return;

        setSyncing(true);
        try {
            // Query for any successful payments (the bug is that hasEntryPass might NOT be set)
            const q = query(collection(db, COLLECTIONS.REGISTRATIONS), where('paymentStatus', '==', 'success'));
            const snap = await getDocs(q);

            let updatedCount = 0;
            const batch = writeBatch(db);
            const BATCH_SIZE = 450;
            let opCount = 0;

            for (const docSnap of snap.docs) {
                const regData = docSnap.data();
                const uid = docSnap.id;

                // Check if user already has pass in USERS collection
                // (We can't read all users efficiently here, so we blind write merge 'hasEntryPass: true')
                // This is safe because we filtered for 'paymentStatus: success'

                const userRef = doc(db, COLLECTIONS.USERS, uid);
                batch.set(userRef, { hasEntryPass: true }, { merge: true });
                opCount++;
                updatedCount++;

                if (opCount >= BATCH_SIZE) {
                    await batch.commit();
                    opCount = 0;
                }
            }

            if (opCount > 0) await batch.commit();

            toast.success(`Sync Complete. Processed ${updatedCount} records.`);
        } catch (error) {
            console.error(error);
            toast.error("Sync Failed. Check console.");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
    }

    return (
        <div className="space-y-6 p-4 md:p-8 pt-6 bg-black min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 flex items-center gap-3">
                        <UserCheck className="w-8 h-8 text-amber-500" /> Entry Pass Holders
                    </h1>
                    <div className="text-neutral-400 mt-2 font-medium flex items-center">
                        Manage users with valid entry passes.
                        <Badge variant="outline" className="ml-3 border-amber-500/30 text-amber-400 bg-amber-950/20">
                            Passes: {users.length}
                        </Badge>
                        <Badge variant="outline" className="ml-2 border-emerald-500/30 text-emerald-400 bg-emerald-950/20">
                            Unique Entries: {entryStats.uniqueCount}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={handleSyncLegacy}
                        disabled={syncing}
                        className="border-amber-900/50 text-amber-600 hover:bg-amber-900/10 hover:text-amber-500"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Sync Legacy Data
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportEntered}
                        className="border-emerald-600/50 text-emerald-500 hover:bg-emerald-900/20 hover:text-emerald-400 font-bold"
                    >
                        <Download className="mr-2 h-4 w-4" /> Export Entries
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="border-amber-600/50 text-amber-500 hover:bg-amber-900/20 hover:text-amber-400 font-bold"
                    >
                        <Download className="mr-2 h-4 w-4" /> Export All Passes
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <Input
                        placeholder="Search by name, reg no, email..."
                        className="pl-10 bg-black/50 border-neutral-800 focus:border-amber-500/50 transition-all text-white h-10 rounded-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="border-neutral-800 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden rounded-xl border border-white/10">
                <div className="relative w-full overflow-auto">
                    <Table>
                        <TableHeader className="bg-neutral-900/90 sticky top-0 z-10">
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="w-[60px] text-neutral-400 font-bold">#</TableHead>
                                <TableHead className="text-neutral-400 font-bold">User Details</TableHead>
                                <TableHead className="text-neutral-400 font-bold">Contact</TableHead>
                                <TableHead className="text-neutral-400 font-bold">Academic Info</TableHead>
                                <TableHead className="text-neutral-400 font-bold text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertTriangle className="w-8 h-8 text-neutral-600" />
                                            <p>No entry pass holders found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user, index) => (
                                    <TableRow key={user.uid} className="border-neutral-800 hover:bg-white/5 transition-colors group">
                                        <TableCell className="font-medium text-neutral-500">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white group-hover:text-amber-400 transition-colors">{user.fullName}</span>
                                                <span className="text-xs text-neutral-500 uppercase tracking-wider font-mono">{user.registrationNumber || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-neutral-300">{user.email}</span>
                                                <span className="text-neutral-500 text-xs font-mono">{user.mobileNumber || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-neutral-300 line-clamp-1 font-medium" title={user.collegeName}>{user.collegeName || '-'}</span>
                                                <span className="text-neutral-500 text-xs">{user.branch || user.department || '-'} • {user.yearOfStudy || '-'} Year</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

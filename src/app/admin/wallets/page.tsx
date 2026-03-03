'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Loader2,
    RefreshCw,
    Wallet,
    Shield,
    Fuel,
    Coins,
    Copy,
    ArrowLeft,
    Trash2,
    Settings2,
    Plus,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function AdminWalletsPage() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const [users, setUsers] = React.useState<any[]>([]);
    const [staff, setStaff] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [stats, setStats] = React.useState({ totalWallets: 0, balance: '0', gas: '0' });
    const [adminStats, setAdminStats] = React.useState<any>(null);
    const [transactions, setTransactions] = React.useState<any[]>([]);

    // New State for Balances & Selection
    const [balances, setBalances] = React.useState<Record<string, string>>({});
    const [loadingBalances, setLoadingBalances] = React.useState(false);
    const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set());
    const [bulkAmount, setBulkAmount] = React.useState('50');

    // Bulk Action State
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [processStatus, setProcessStatus] = React.useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, staffRes, txRes] = await Promise.all([
                fetch('/api/admin/wallets?type=users'),
                fetch('/api/admin/wallets?type=staff'),
                fetch('/api/admin/transactions')
            ]);

            const usersData = await usersRes.json();
            if (usersData.success) {
                setUsers(usersData.users);
            }

            const staffData = await staffRes.json();
            if (staffData.success) {
                setStaff(staffData.users);
            }

            if (usersData.success && staffData.success) {
                const totalWallets =
                    usersData.users.filter((u: any) => u.walletAddress).length +
                    staffData.users.filter((u: any) => u.walletAddress).length;
                setStats(prev => ({ ...prev, totalWallets }));
            }

            if (txRes.ok) {
                const txData = await txRes.json();
                if (txData.success) {
                    setTransactions(txData.transactions);
                }
            }

            fetchAdminStats();
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const loadBalances = async () => {
        const allEntities = [...users, ...staff];
        if (allEntities.length === 0) return;
        setLoadingBalances(true);
        toast.info("Fetching live balances...");

        const newBalances: Record<string, string> = {};

        // Process in chunks of 5
        const chunk = 5;
        for (let i = 0; i < allEntities.length; i += chunk) {
            const batch = allEntities.slice(i, i + chunk);
            await Promise.all(batch.map(async (u) => {
                if (u.walletAddress) {
                    try {
                        const collection = u.registrationNumber === 'STAFF' ? 'staff_credentials' : 'users';
                        const res = await fetch(`/api/wallet/balance?userId=${u.id}&collectionName=${collection}`);
                        const data = await res.json();
                        if (data.exists) {
                            newBalances[u.id] = parseFloat(data.balance).toFixed(2);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }));
        }
        setBalances(prev => ({ ...prev, ...newBalances }));
        setLoadingBalances(false);
        toast.success("Balances updated");
    };

    const createWallet = async (userId: string, email: string, collectionName: string = 'users') => {
        try {
            const res = await fetch('/api/wallet/create', {
                method: 'POST',
                body: JSON.stringify({ userId, email, collectionName }),
            });
            if (res.ok) {
                toast.success(`Wallet created for ${email}`);
                fetchData();
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to create wallet");
        }
    };

    const fetchAdminStats = async () => {
        try {
            const res = await fetch('/api/admin/system');
            const data = await res.json();
            if (data.success) {
                setAdminStats(data);
            }
        } catch (e) { console.error(e); }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm("Are you sure? This will DELETE the user and their wallet permanently.")) return;
        try {
            const res = await fetch('/api/admin/user/delete', {
                method: 'POST',
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                toast.success("User deleted");
                fetchData();
            } else {
                toast.error("Failed to delete");
            }
        } catch (e) { toast.error("Error deleting user"); }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Address Copied");
    };

    const toggleAirdrop = async () => {
        if (!adminStats) return;
        const newState = !adminStats.settings.airdropEnabled;
        try {
            const res = await fetch('/api/admin/system', {
                method: 'POST',
                body: JSON.stringify({ airdropEnabled: newState }),
            });
            if (res.ok) {
                toast.success(`Auto-Airdrop ${newState ? 'Enabled' : 'Disabled'}`);
                fetchAdminStats();
            }
        } catch (e) { toast.error("Failed to update settings"); }
    };

    const toggleSelection = (userId: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            const newSet = new Set(filteredUsers.map(u => u.id));
            setSelectedUsers(newSet);
        }
    };

    const handleBulkAirdrop = async () => {
        if (selectedUsers.size === 0) return;

        const all = [...users, ...staff];
        const targets = all.filter(u => selectedUsers.has(u.id) && u.walletAddress);

        if (targets.length === 0) {
            toast.error("No selected users have active wallets.");
            return;
        }

        if (!confirm(`Send ${bulkAmount} AFT to ${targets.length} users?`)) return;

        setIsProcessing(true);
        let success = 0;
        let fail = 0;

        for (let i = 0; i < targets.length; i++) {
            const user = targets[i];
            setProcessStatus(`Sending to ${user.email} (${i + 1}/${targets.length})...`);
            try {
                const res = await fetch('/api/admin/distribute', {
                    method: 'POST',
                    body: JSON.stringify({ userId: user.id, amount: Number(bulkAmount) }),
                });
                if (res.ok) success++;
                else fail++;
            } catch (e) { fail++; }
            await new Promise(r => setTimeout(r, 500));
        }

        setIsProcessing(false);
        setProcessStatus('');
        toast.success(`Complete: ${success} Sent, ${fail} Failed`);
        setSelectedUsers(new Set());
        fetchData();
        loadBalances();
    };

    const filteredUsers = users.filter((u: any) =>
        (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredStaff = staff.filter((u: any) =>
        (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 pb-32">
            <header className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-black uppercase tracking-tight">Wallet Manager</h1>
                    <p className="text-slate-500 font-bold text-sm">Custodial System & Airdrops</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadBalances} variant="outline" className="gap-2 font-bold" disabled={loadingBalances}>
                        {loadingBalances ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                        {loadingBalances ? 'Loading...' : 'Check Balances'}
                    </Button>
                    <Button onClick={fetchData} variant="outline" size="icon" title="Refresh Data">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-black text-white border-2 border-black shadow-neo rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase">Active Wallets</CardTitle>
                        <Wallet className="w-4 h-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black">{stats.totalWallets} <span className="text-lg opacity-50">/ {users.length + staff.length}</span></div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-2 border-black shadow-neo rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">System Status</CardTitle>
                        <Fuel className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black mb-1 text-green-600">OPERATIONAL</div>
                        <div className="text-xs font-bold text-slate-500">Sepolia Testnet</div>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-50 border-2 border-indigo-200 shadow-neo rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-indigo-500 uppercase">Total User Balance</CardTitle>
                        <Coins className="w-4 h-4 text-indigo-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black mb-1 text-indigo-900">
                            {Object.values(balances).reduce((acc, curr) => acc + Number(curr), 0).toFixed(0)} AFT
                        </div>
                        <div className="text-xs font-bold text-indigo-400">Across {Object.keys(balances).length} scanned</div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Wallet & Controls */}
            {adminStats && (
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-slate-900 text-white border-2 border-slate-800 shadow-xl rounded-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-32 h-32" /></div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Admin/Genesis Wallet
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            <div>
                                <div className="text-3xl font-black text-yellow-400 flex items-baseline gap-2">
                                    {parseFloat(adminStats.adminWallet.tokenBalance).toLocaleString()} <span className="text-sm text-yellow-600">AFT</span>
                                </div>
                                <div className="text-sm font-mono text-slate-400 flex items-center gap-2 bg-black/30 p-2 rounded-lg mt-2 w-fit">
                                    {adminStats.adminWallet.address.slice(0, 10)}...{adminStats.adminWallet.address.slice(-8)}
                                    <Button size="icon" variant="ghost" className="h-4 w-4 text-slate-400 hover:text-white" onClick={() => copyToClipboard(adminStats.adminWallet.address)}>
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> Gas: {parseFloat(adminStats.adminWallet.gasBalance).toFixed(4)} ETH</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-slate-200 shadow-neo rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                                <Settings2 className="w-5 h-5" /> Automation Controls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <h3 className="font-bold text-slate-900">Auto-Airdrop (50 AFT)</h3>
                                    <p className="text-xs text-slate-500">Give 50 AFT + Gas to new wallets on creation.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={adminStats.settings.airdropEnabled}
                                        onCheckedChange={toggleAirdrop}
                                        className="w-6 h-6 border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-600"
                                    />
                                    <span className={cn("text-xs font-bold uppercase", adminStats.settings.airdropEnabled ? "text-green-600" : "text-slate-400")}>
                                        {adminStats.settings.airdropEnabled ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-2 border-black shadow-neo rounded-2xl bg-white overflow-hidden min-h-[500px]">
                <CardHeader className="border-b-2 border-slate-100 p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <Tabs defaultValue="users" className="w-full">
                            <div className="flex justify-between items-center mb-4">
                                <TabsList className="bg-slate-100">
                                    <TabsTrigger value="users" className="font-bold">Students</TabsTrigger>
                                    <TabsTrigger value="staff" className="font-bold">Coordinators</TabsTrigger>
                                    <TabsTrigger value="txs" className="font-bold">Transactions</TabsTrigger>
                                </TabsList>
                                <Input
                                    placeholder="Search..."
                                    className="max-w-xs h-9 rounded-xl border-2 border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <TabsContent value="users" className="m-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-slate-50/50 bg-slate-50 border-b-2 border-slate-100">
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Identity</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Wallet</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Balance</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-60 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20 mb-2" />
                                                    <div className="text-xs font-bold text-slate-400">Loading directory...</div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-40 text-center font-bold opacity-40">
                                                    No users found
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredUsers.map((u: any) => (
                                            <TableRow key={u.id} className={cn("transition-colors", selectedUsers.has(u.id) ? "bg-indigo-50/50" : "hover:bg-slate-50")}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedUsers.has(u.id)}
                                                        onCheckedChange={() => toggleSelection(u.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm flex items-center gap-2">
                                                            {u.fullName || 'Unknown Student'}
                                                            {u.role === 'admin' && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-indigo-100 text-indigo-700">Admin</Badge>}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-mono">{u.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {u.walletAddress ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                                <span className="text-xs font-mono text-slate-500">{u.walletAddress.slice(0, 10)}...{u.walletAddress.slice(-6)}</span>
                                                                <Button size="icon" variant="ghost" className="h-5 w-5 text-slate-300 hover:text-slate-600" onClick={() => copyToClipboard(u.walletAddress)}>
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="destructive" className="font-bold text-[10px]">Missing</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {balances[u.id] ? (
                                                        <span className="font-bold text-sm">{balances[u.id]} AFT</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-2">
                                                    {!u.walletAddress && (
                                                        <Button size="sm" onClick={() => createWallet(u.id, u.email, 'users')} className="h-7 text-xs font-bold bg-black text-white">
                                                            <Plus className="w-3 h-3 mr-1" /> Provision
                                                        </Button>
                                                    )}
                                                    {u.role !== 'admin' && (
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-300 hover:text-red-600 hover:bg-red-50" onClick={() => deleteUser(u.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            <TabsContent value="staff" className="m-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-slate-50/50 bg-slate-50 border-b-2 border-slate-100">
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Coordinator Identity</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Role</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Wallet</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Balance</TableHead>
                                            <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-60 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20 mb-2" />
                                                    <div className="text-xs font-bold text-slate-400">Loading coordinators...</div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredStaff.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-40 text-center font-bold opacity-40">
                                                    No coordinators found
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredStaff.map((u: any) => (
                                            <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-purple-700">
                                                            {u.fullName || 'Staff Member'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-mono">{u.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold bg-white text-slate-600">
                                                        {u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {u.walletAddress ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                                <span className="text-xs font-mono text-slate-500">{u.walletAddress.slice(0, 10)}...{u.walletAddress.slice(-6)}</span>
                                                                <Button size="icon" variant="ghost" className="h-5 w-5 text-slate-300 hover:text-slate-600" onClick={() => copyToClipboard(u.walletAddress)}>
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="secondary" className="font-bold text-[10px] bg-slate-100 text-slate-400">Not Created</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {balances[u.id] ? (
                                                        <span className="font-bold text-sm text-yellow-700">{balances[u.id]} AFT</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-2">
                                                    {!u.walletAddress && (
                                                        <Button size="sm" onClick={() => createWallet(u.id, u.email, 'staff_credentials')} className="h-7 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white">
                                                            <Plus className="w-3 h-3 mr-1" /> Create Wallet
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            <TabsContent value="txs" className="m-0">
                                <div className="border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 border-b border-slate-200">
                                                <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Tx Hash</TableHead>
                                                <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">From</TableHead>
                                                <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">To</TableHead>
                                                <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Amount</TableHead>
                                                <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500 text-right">Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((tx: any) => (
                                                <TableRow key={tx.id} className="hover:bg-slate-50">
                                                    <TableCell className="font-mono text-xs text-indigo-600 truncate max-w-[120px]">
                                                        <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="hover:underline">{tx.txHash?.slice(0, 8)}...</a>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{tx.from?.slice(0, 6)}...</TableCell>
                                                    <TableCell className="font-mono text-xs">{tx.to?.slice(0, 6)}...</TableCell>
                                                    <TableCell className="font-black text-sm">{tx.amount} AFT</TableCell>
                                                    <TableCell className="text-right text-xs text-slate-500">{tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Pending'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardHeader>
            </Card>

            {/* Bulk Action Sticky Bar */}
            {selectedUsers.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <div className="bg-white text-black font-black w-8 h-8 rounded-full flex items-center justify-center text-sm">{selectedUsers.size}</div>
                        <span className="font-bold text-sm">Selected</span>
                    </div>
                    <div className="h-8 w-px bg-zinc-800" />

                    {/* Airdrop Input */}
                    <div className="flex items-center gap-2">
                        <Input
                            value={bulkAmount}
                            onChange={(e) => setBulkAmount(e.target.value)}
                            className="w-20 h-9 bg-zinc-900 border-zinc-700 text-white font-bold text-center"
                        />
                        <span className="text-xs font-bold text-zinc-500">AFT</span>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleBulkAirdrop}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold rounded-full"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            {isProcessing ? processStatus || 'Processing...' : 'Airdrop'}
                        </Button>
                    </div>

                    <button onClick={() => setSelectedUsers(new Set())} className="ml-2 text-zinc-500 hover:text-white">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

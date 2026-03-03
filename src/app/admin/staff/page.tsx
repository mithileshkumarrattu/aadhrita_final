'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserPlus, Shield, Users, Lock, ChevronLeft } from 'lucide-react';
import { getAllStaff, createStaff, deleteStaff } from '@/lib/staff-auth';
import { getEvents } from '@/lib/db';
import { StaffCredential } from '@/lib/db';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AdminStaffPage() {
    const router = useRouter();
    const [staffList, setStaffList] = React.useState<StaffCredential[]>([]);
    const [events, setEvents] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Form State
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [role, setRole] = React.useState<'security' | 'coordinator' | 'hackathon_coordinator' | 'entrypass_viewer' | 'registrations_viewer'>('security');
    const [assignedEventId, setAssignedEventId] = React.useState('');

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [staffData, eventsData] = await Promise.all([
                getAllStaff(),
                getEvents()
            ]);
            setStaffList(staffData);
            setEvents(eventsData);
        } catch (error) {
            toast.error("Failed to load data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!username || !password) {
                toast.error("Username and Password are required");
                return;
            }

            if (role === 'coordinator' && !assignedEventId) {
                toast.error("Please assign an event to the coordinator");
                return;
            }

            const newStaff: StaffCredential = {
                username,
                password,
                role,
                assignedEventId: role === 'coordinator' && assignedEventId ? assignedEventId : null,
            };

            const staffRef = await createStaff(newStaff);

            // Auto-provision Wallet
            try {
                const walletRes = await fetch('/api/wallet/create', {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: staffRef.id,
                        email: username, // Use username as email identifier for staff
                        collectionName: 'staff_credentials' // Matches COLLECTIONS.STAFF value
                    })
                });

                if (walletRes.ok) {
                    toast.success("Staff wallet created");
                } else {
                    console.error("Wallet creation failed", await walletRes.json());
                    toast.warning("Staff created but wallet failed. Provision manually.");
                }
            } catch (wErr) {
                console.error("Wallet provision error", wErr);
            }

            toast.success("Staff member created successfully");

            // Reset Form
            setUsername('');
            setPassword('');
            setRole('security');
            setAssignedEventId('');

            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create staff");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await deleteStaff(id);
            toast.success("Staff deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete staff");
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-8 pt-20">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-white">
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600">
                            Staff Management
                        </h1>
                        <p className="text-zinc-400">Create login credentials for Security & Coordinators</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Create New Staff Form */}
                    <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <UserPlus className="w-5 h-5 text-yellow-500" />
                                Add New Staff
                            </CardTitle>
                            <CardDescription>Assign roles and generate credentials.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-zinc-500">Username / ID</label>
                                    <Input
                                        placeholder="e.g. sec_main_gate"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="bg-black/50 border-zinc-700 focus:border-yellow-500 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-zinc-500">Password</label>
                                    <Input
                                        type="text"
                                        placeholder="Simple password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-black/50 border-zinc-700 focus:border-yellow-500 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-zinc-500">Role</label>
                                    <Select
                                        value={role}
                                        onValueChange={(val: any) => setRole(val)}
                                    >
                                        <SelectTrigger className="bg-black/50 border-zinc-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                            <SelectItem value="security">Security Guard</SelectItem>
                                            <SelectItem value="coordinator">Event Coordinator</SelectItem>
                                            <SelectItem value="hackathon_coordinator">Hackathon Coordinator</SelectItem>
                                            <SelectItem value="entrypass_viewer">Entry Pass Viewer</SelectItem>
                                            <SelectItem value="registrations_viewer">Master Registrations Viewer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {role === 'coordinator' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-semibold uppercase text-zinc-500">Assigned Event</label>
                                        <Select
                                            value={assignedEventId}
                                            onValueChange={setAssignedEventId}
                                        >
                                            <SelectTrigger className="bg-black/50 border-zinc-700">
                                                <SelectValue placeholder="Select Event" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 h-64">
                                                {events.map(event => (
                                                    <SelectItem key={event.id} value={event.id}>
                                                        {event.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <Button
                                    className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-bold mt-4"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Create Credentials'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Staff List */}
                    <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Users className="w-5 h-5 text-blue-500" />
                                Active Staff
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-zinc-800 overflow-hidden">
                                <div className="grid grid-cols-12 bg-zinc-950 p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                                    <div className="col-span-3">Username</div>
                                    <div className="col-span-3">Role</div>
                                    <div className="col-span-4">Assignment / Password</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>
                                <div className="divide-y divide-zinc-800/50">
                                    {staffList.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 italic">No staff members found.</div>
                                    ) : (
                                        staffList.map((staff) => (
                                            <div key={staff.id} className="grid grid-cols-12 p-3 items-center hover:bg-white/5 transition-colors">
                                                <div className="col-span-3 font-medium text-white flex items-center gap-2">
                                                    {staff.role === 'security' ? <Shield className="w-3 h-3 text-green-500" /> :
                                                        staff.role === 'hackathon_coordinator' ? <Users className="w-3 h-3 text-yellow-500" /> :
                                                            <Lock className="w-3 h-3 text-purple-500" />}
                                                    {staff.username}
                                                </div>
                                                <div className="col-span-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${staff.role === 'security'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : staff.role === 'hackathon_coordinator'
                                                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            : staff.role === 'entrypass_viewer'
                                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                : staff.role === 'registrations_viewer'
                                                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                        }`}>
                                                        {
                                                            staff.role === 'hackathon_coordinator' ? 'Hackathon Coord'
                                                                : staff.role === 'entrypass_viewer' ? 'Entry Pass'
                                                                    : staff.role === 'registrations_viewer' ? 'Master Reg Views'
                                                                        : staff.role
                                                        }
                                                    </span>
                                                </div>
                                                <div className="col-span-4 text-xs text-zinc-400">
                                                    {staff.role === 'coordinator' ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-zinc-300">
                                                                {events.find(e => e.id === staff.assignedEventId)?.title || 'Unknown Event'}
                                                            </span>
                                                            <span className="text-[10px] font-mono opacity-50">Pass: {staff.password}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono opacity-50">Pass: {staff.password}</span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                                                        onClick={() => handleDelete(staff.id!, staff.username)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

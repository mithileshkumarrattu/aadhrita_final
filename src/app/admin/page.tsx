'use client';
export const dynamic = 'force-dynamic';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Bell, Calendar, Image as ImageIcon, Shield, Settings, ShieldAlert, LogOut, Ticket } from 'lucide-react';
import { db, COLLECTIONS } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { EventService } from '@/services/EventService';
import { UserService } from '@/services/UserService';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
    const router = useRouter();
    // ... stats state ...

    const [maintenanceLoading, setMaintenanceLoading] = React.useState(false);

    // --- Maintenance Functions ---

    // 1. Fix Corrupted Photos
    const handleFixPhotos = async () => {
        setMaintenanceLoading(true);
        try {
            const usersRef = collection(db, COLLECTIONS.USERS);
            const snapshot = await getDocs(usersRef);

            let fixedCount = 0;
            const batch = writeBatch(db);

            snapshot.forEach(d => {
                const data = d.data();
                if (data.photoUrl && (data.photoUrl.includes('/entrypass/photoUrl.jpg') || data.photoUrl.endsWith('/photoUrl.jpg'))) {
                    const ref = doc(db, 'users', d.id);
                    batch.update(ref, { photoUrl: '' }); // Clear it
                    fixedCount++;
                } else if (data.photoUrl && data.photoUrl.startsWith('https://lh3.googleusercontent.com/a/')) {
                    const newUrl = data.photoUrl.split('=s96-c')[0];
                    if (newUrl !== data.photoUrl) {
                        batch.update(d.ref, { photoUrl: newUrl });
                        fixedCount++;
                    }
                }
            });

            if (fixedCount > 0) {
                await batch.commit();
                toast.success(`Fixed ${fixedCount} corrupted user photos.`);
            } else {
                toast.info("No photos needed fixing.");
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to fix photos: " + error.message);
        } finally {
            setMaintenanceLoading(false);
        }
    };

    // 2. Backfill Welcome Kit Flag
    const handleBackfillWelcomeKit = async () => {
        setMaintenanceLoading(true);
        try {
            const usersRef = collection(db, COLLECTIONS.USERS);
            const q = query(usersRef, where('hasEntryPass', '==', true));
            const snapshot = await getDocs(q);

            let updatedCount = 0;
            let skippedCount = 0;

            const chunks: any[][] = [];
            let currentChunk: any[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.hasReceivedWelcomeKit === undefined) {
                    currentChunk.push(doc);
                    updatedCount++;
                    if (currentChunk.length === 490) {
                        chunks.push(currentChunk);
                        currentChunk = [];
                    }
                } else {
                    skippedCount++;
                }
            });

            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => {
                    batch.update(doc.ref, { hasReceivedWelcomeKit: false });
                });
                await batch.commit();
            }

            if (updatedCount > 0) {
                toast.success(`Backfilled 'hasReceivedWelcomeKit: false' for ${updatedCount} users.`);
            } else {
                toast.info(`All ${skippedCount} paid users already have the flag set.`);
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to backfill Welcome Kit flag: " + error.message);
        } finally {
            setMaintenanceLoading(false);
        }
    };

    const [stats, setStats] = React.useState([
        { label: 'Total Students', value: '-', icon: Users, color: 'bg-blue-100' },
        { label: 'Clubs Active', value: '-', icon: Users, color: 'bg-purple-100' },
        { label: 'Notes Uploaded', value: '-', icon: FileText, color: 'bg-yellow-100' },
        { label: 'Global Alerts', value: '-', icon: Bell, color: 'bg-red-100' },
    ]);

    // Widget State
    const [loadingWidgets, setLoadingWidgets] = React.useState(true);
    const [recentEvents, setRecentEvents] = React.useState<any[]>([]);
    const [userStats, setUserStats] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchStats = async () => {
            // ... (Existing basic stats logic would go here, merging it below)

            // 1. Users & Demographics
            try {
                const users = await UserService.getAllUsers('student'); // Filter by student
                const usersCount = users.length;

                // Demo Calculation
                const branchCounts: Record<string, number> = {};
                users.forEach(u => {
                    const b = u.branch || 'Unknown';
                    branchCounts[b] = (branchCounts[b] || 0) + 1;
                });

                const topBranches = Object.entries(branchCounts)
                    .map(([branch, count]) => ({ branch, count, percent: Math.round((count / usersCount) * 100) }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 4);

                setUserStats(topBranches);

                // 2. Clubs
                const clubsSnap = await getDocs(collection(db, 'clubs'));

                // 3. Notes
                const notesSnap = await getDocs(collection(db, 'notes'));

                // 4. Notifications
                const notifsSnap = await getDocs(collection(db, 'notifications'));

                setStats([
                    { label: 'Total Students', value: usersCount.toString(), icon: Users, color: 'bg-blue-100' },
                    { label: 'Clubs Active', value: clubsSnap.size.toString(), icon: Calendar, color: 'bg-purple-100' },
                    { label: 'Notes Uploaded', value: notesSnap.size.toString(), icon: FileText, color: 'bg-yellow-100' },
                    { label: 'Global Alerts', value: notifsSnap.size.toString(), icon: Bell, color: 'bg-red-100' },
                ]);

                // 5. Recent Events
                const events = await EventService.getAllEvents();
                setRecentEvents(events);

            } catch (e) {
                console.error("Dashboard Load Failed", e);
            } finally {
                setLoadingWidgets(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black tracking-tighter">Overview</h1>
                <div className="px-4 py-2 bg-black text-white rounded-xl font-bold text-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-6 border-2 border-black shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all rounded-2xl bg-white">
                        <div className={`w-12 h-12 rounded-xl ${stat.color} border-2 border-black flex items-center justify-center mb-4`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div className="text-3xl font-black">{stat.value}</div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">{stat.label}</div>
                    </Card>
                ))}
                <Card
                    className="p-6 border-2 border-black shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all rounded-2xl bg-white cursor-pointer group"
                    onClick={() => router.push('/admin/content')}
                >
                    <div className="w-12 h-12 rounded-xl bg-orange-100 border-2 border-black flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-xl font-black mb-1">Manage Content</div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Home Poster</div>
                </Card>
                <Card
                    className="p-6 border-2 border-dashed border-slate-300 shadow-sm hover:border-black hover:shadow-neo transition-all rounded-2xl bg-slate-50 cursor-pointer group"
                    onClick={() => router.push('/admin/migration')}
                >
                    <div className="w-12 h-12 rounded-xl bg-green-100 border-2 border-slate-300 group-hover:border-black flex items-center justify-center mb-4 transition-colors">
                        <Users className="w-6 h-6 text-green-700" />
                    </div>
                    <div className="text-xl font-black mb-1">Data Migration</div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Sync Old Users</div>
                </Card>
            </div>

            {/* Dynamic Widgets Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Events Widget */}
                <Card className="p-6 border-2 border-black shadow-neo rounded-2xl bg-white flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xl uppercase tracking-tight">Recent Events</h3>
                        <Button variant="outline" size="sm" onClick={() => router.push('/admin/events')}>View All</Button>
                    </div>
                    {loadingWidgets ? (
                        <div className="flex-1 flex items-center justify-center opacity-40">Loading Events...</div>
                    ) : recentEvents.length > 0 ? (
                        <div className="space-y-4">
                            {recentEvents.slice(0, 3).map((ev: any) => (
                                <div key={ev.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => router.push('/admin/events')}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                                            {ev.title.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{ev.title}</div>
                                            <div className="text-xs text-slate-500">{new Date(ev.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ev.registrationStatus === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {ev.registrationStatus}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                            <Calendar className="w-8 h-8 mb-2" />
                            <div className="text-sm font-bold">No events yet</div>
                        </div>
                    )}
                </Card>

                {/* Demographics Widget */}
                <Card className="p-6 border-2 border-black shadow-neo rounded-2xl bg-white flex flex-col">
                    <Tabs defaultValue="demographics" className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <TabsList className="grid w-full grid-cols-2 max-w-sm">
                                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                            </TabsList>
                            <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>Directory</Button>
                        </div>
                        <TabsContent value="demographics" className="flex-1 flex flex-col">
                            {loadingWidgets ? (
                                <div className="flex-1 flex items-center justify-center opacity-40">Analyzing Data...</div>
                            ) : (
                                <div className="space-y-4">
                                    {userStats.length > 0 ? userStats.map((stat, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold uppercase mb-1">
                                                <span>{stat.branch}</span>
                                                <span className="text-slate-500">{stat.count} Students ({stat.percent}%)</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${stat.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                            <Users className="w-8 h-8 mb-2" />
                                            <div className="text-sm font-bold">No user data found</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="maintenance" className="flex-1 flex flex-col">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-black mb-4">Database Migration & Fixes</h3>
                                <div className="grid gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-black">Fix Corrupted Google Photos</p>
                                            <p className="text-xs text-slate-500">Removes '=s96-c' from high-res URLs.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleFixPhotos}
                                            disabled={maintenanceLoading}
                                        >
                                            {maintenanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Fix"}
                                        </Button>
                                    </div>

                                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Ticket className="w-4 h-4 text-purple-600" />
                                                <p className="font-bold text-black">Backfill Welcome Kit Status</p>
                                            </div>
                                            <p className="text-xs text-slate-500">Adds 'hasReceivedWelcomeKit: false' to all existing paid users.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-purple-300 text-purple-700 hover:bg-purple-100"
                                            onClick={handleBackfillWelcomeKit}
                                            disabled={maintenanceLoading}
                                        >
                                            {maintenanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Backfill"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}

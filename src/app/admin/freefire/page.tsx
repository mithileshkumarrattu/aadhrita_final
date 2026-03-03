'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trophy, Download, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });

interface Player {
    name: string;
    ign: string;
    college: string;
    contact: string;
}

interface FreeFireTeam {
    id: string;
    teamName: string;
    leader: {
        name: string;
        contact: string;
    };
    players: Player[];
    paymentStatus: string;
    transactionId?: string;
    orderId?: string;
    createdAt: any;
    paidAt?: string;
}

export default function FreeFireAdminPage() {
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const [teams, setTeams] = React.useState<FreeFireTeam[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Fetch teams on mount
    React.useEffect(() => {
        const fetchTeams = async () => {
            try {
                const q = query(
                    collection(db, COLLECTIONS.FREEFIRE_TEAMS),
                    where('paymentStatus', '==', 'success'),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const teamsData: FreeFireTeam[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data() as Omit<FreeFireTeam, 'id'>
                }));
                setTeams(teamsData);
            } catch (error) {
                console.error("Error fetching teams:", error);
                toast.error("Failed to load registrations");
            } finally {
                setLoading(false);
            }
        };

        if (userProfile?.role === 'admin') {
            fetchTeams();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [userProfile, authLoading]);

    // Export to CSV
    const exportToCSV = () => {
        if (teams.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = [
            'Team Name',
            'Leader Name',
            'Leader Contact',
            'P1 Name', 'P1 IGN', 'P1 College', 'P1 Contact',
            'P2 Name', 'P2 IGN', 'P2 College', 'P2 Contact',
            'P3 Name', 'P3 IGN', 'P3 College', 'P3 Contact',
            'P4 Name', 'P4 IGN', 'P4 College', 'P4 Contact',
            'Payment Status',
            'Transaction ID',
            'Order ID',
            'Registered At'
        ];

        const rows = filteredTeams.map(team => {
            const players = team.players;
            return [
                team.teamName,
                team.leader.name,
                team.leader.contact,
                // Player 1
                players[0]?.name || '',
                players[0]?.ign || '',
                players[0]?.college || '',
                players[0]?.contact || '',
                // Player 2
                players[1]?.name || '',
                players[1]?.ign || '',
                players[1]?.college || '',
                players[1]?.contact || '',
                // Player 3
                players[2]?.name || '',
                players[2]?.ign || '',
                players[2]?.college || '',
                players[2]?.contact || '',
                // Player 4
                players[3]?.name || '',
                players[3]?.ign || '',
                players[3]?.college || '',
                players[3]?.contact || '',
                team.paymentStatus,
                team.transactionId || '',
                team.orderId || '',
                team.createdAt?.toDate ? new Date(team.createdAt.toDate()).toLocaleString() : ''
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `freefire_registrations_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success("CSV exported successfully!");
    };

    // Filter teams search
    const filteredTeams = teams.filter(team => {
        const search = searchQuery.toLowerCase();
        return (
            team.teamName.toLowerCase().includes(search) ||
            team.leader.name.toLowerCase().includes(search) ||
            team.leader.contact.includes(search) ||
            team.players.some(p =>
                p.name.toLowerCase().includes(search) ||
                p.ign.toLowerCase().includes(search) ||
                p.college.toLowerCase().includes(search)
            )
        );
    });

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto" />
                    <p className="text-neutral-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Access control
    if (userProfile?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-red-900/10 p-8 rounded-3xl border border-red-500/30 text-center space-y-4">
                    <h2 className={cn("text-2xl font-bold text-white", cinzel.className)}>Access Denied</h2>
                    <p className="text-neutral-400">This page is restricted to administrators only.</p>
                    <Button onClick={() => router.push('/dashboard')} className="bg-white text-black hover:bg-neutral-200">
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const MAX_TEAMS = 144;
    const slotsRemaining = MAX_TEAMS - teams.length;

    return (
        <div className="min-h-screen bg-[#050505 ] text-white p-4 pb-20">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-8 mt-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className={cn("text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700", cinzel.className)}>
                            FREEFIRE ADMIN
                        </h1>
                        <p className="text-neutral-400 mt-1">Tournament Registration Management</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={exportToCSV}
                            disabled={teams.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 rounded-xl"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500">Total Registrations</p>
                                <p className={cn("text-4xl font-black text-white mt-1", cinzel.className)}>
                                    {teams.length}
                                </p>
                            </div>
                            <Trophy className="w-12 h-12 text-red-500 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500">Slots Remaining</p>
                                <p className={cn("text-4xl font-black text-white mt-1", cinzel.className)}>
                                    {slotsRemaining}
                                </p>
                            </div>
                            <Users className="w-12 h-12 text-amber-500 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500">Total Players</p>
                                <p className={cn("text-4xl font-black text-white mt-1", cinzel.className)}>
                                    {teams.length * 4}
                                </p>
                            </div>
                            <Users className="w-12 h-12 text-green-500 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                        <Input
                            placeholder="Search by team name, leader name, player name, IGN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 bg-black/40 text-white border-white/10"
                        />
                    </div>
                </div>

                {/* Teams Table */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-black/40">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Team Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Leader</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Players</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Transaction</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {filteredTeams.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                                            {searchQuery ? 'No teams found matching your search' : 'No teams registered yet'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTeams.map((team, index) => (
                                        <tr key={team.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-neutral-400">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white">{team.teamName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-neutral-300">{team.leader.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-neutral-400">{team.leader.contact}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {team.players.map((player, pIndex) => (
                                                        <div key={pIndex} className="text-xs text-neutral-400">
                                                            {player.name} ({player.ign})
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-mono text-neutral-500">
                                                    {team.transactionId || team.orderId || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-neutral-500">
                                                    {team.createdAt?.toDate
                                                        ? new Date(team.createdAt.toDate()).toLocaleString()
                                                        : 'N/A'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

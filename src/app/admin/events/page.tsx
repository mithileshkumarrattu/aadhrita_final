'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventService } from '@/services/EventService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Edit, Trash2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AdminEventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const data = await EventService.getAllEvents();
            setEvents(data);
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const copyLink = (id: string) => {
        const url = `${window.location.origin}/events/details/${id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied!");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
        try {
            await EventService.deleteEvent(id);
            toast.success("Event deleted");
            fetchEvents();
        } catch (e) {
            toast.error("Failed to delete");
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manage Events</h1>
                    <p className="text-slate-500">View, edit, and manage all fest events.</p>
                </div>
                <Button onClick={() => router.push('/admin/events/create')} className="bg-black hover:bg-neutral-800 text-white gap-2">
                    <Plus className="w-4 h-4" /> Create Event
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[300px]">Event Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Fees</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                    No events found. Create your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((ev) => (
                                <TableRow key={ev.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-base font-bold text-slate-800">{ev.title}</span>
                                            <span className="text-xs text-slate-400">{ev.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-slate-600 border-slate-200">
                                            {ev.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "capitalize",
                                            ev.registrationStatus === 'open' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                                ev.registrationStatus === 'closed' ? "bg-red-100 text-red-700 hover:bg-red-100 mt-2" :
                                                    "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 mt-2"
                                        )}>
                                            {ev.registrationStatus?.replace('_', ' ') || 'Open'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="font-medium text-slate-700">₹{ev.entryFeeInr}</span>
                                            <span className="text-xs text-[#d4af37] font-bold">+{ev.entryFeeAft} AFT</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => copyLink(ev.id)}>
                                                <LinkIcon className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600" onClick={() => router.push(`/admin/events/edit/${ev.id}`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(ev.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

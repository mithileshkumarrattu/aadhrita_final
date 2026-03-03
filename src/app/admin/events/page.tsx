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
import { useCategories } from '@/hooks/use-categories';

export default function AdminEventsPage() {
    const { categories } = useCategories();
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

    // Grouping Logic
    const groupedEvents = React.useMemo(() => {
        const groups: Record<string, any[]> = {};

        // Helper to normalize category name for matching
        const normalize = (c: string) => {
            if (!c) return 'Other';
            const lower = c.toLowerCase();
            if (lower.includes('tech')) return 'Tech Frontier Challenges';
            if (lower.includes('brain')) return 'Brain Wave Challenges';
            if (lower.includes('skill')) return 'Skill Forge Workshops';
            if (lower.includes('media') || lower.includes('esports') || lower.includes('e-sports')) return 'Multi Media & E-Sports';
            if (lower.includes('cultural')) return 'Cultural Events';
            if (lower.includes('sport')) return 'Sports';
            if (lower.includes('hack')) return 'Hackathon';
            return c;
        };

        events.forEach(ev => {
            const normCat = normalize(ev.category);
            if (!groups[normCat]) groups[normCat] = [];
            groups[normCat].push(ev);
        });

        return groups;
    }, [events]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manage Events</h1>
                    <p className="text-slate-500">View, edit, and manage all fest events.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/admin/categories')} className="gap-2">
                        <LinkIcon className="w-4 h-4" /> Manage Categories
                    </Button>
                    <Button onClick={() => router.push('/admin/events/create')} className="bg-black hover:bg-neutral-800 text-white gap-2">
                        <Plus className="w-4 h-4" /> Create Event
                    </Button>
                </div>
            </div>

            <div className="space-y-8">
                {/* 1. Render Ordered Categories */}
                {categories.map((cat, index) => {
                    const categoryEvents = groupedEvents[cat.label] || [];
                    if (categoryEvents.length === 0) return null;

                    return (
                        <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                                <div className="h-8 w-1 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
                                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{cat.label}</h2>
                                <Badge variant="secondary" className="ml-auto">{categoryEvents.length} Events</Badge>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/20">
                                        <TableHead className="w-[300px]">Event Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Fees</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoryEvents.map((ev: any) => (
                                        <TableRow key={ev.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-bold text-slate-800">{ev.title}</span>
                                                    <span className="text-xs text-slate-400">{ev.id}</span>
                                                </div>
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
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    );
                })}

                {/* 2. Render Check for "Other" that didn't match */}
                {Object.keys(groupedEvents).filter(k => !categories.find(c => c.label === k)).map(key => (
                    <div key={key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden opacity-80">
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center gap-3">
                            <div className="h-8 w-1 bg-slate-400 rounded-full" />
                            <h2 className="text-lg font-bold text-slate-600 uppercase tracking-wider">{key} (Uncategorized)</h2>
                            <Badge variant="secondary" className="ml-auto">{groupedEvents[key].length} Events</Badge>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/20">
                                    <TableHead className="w-[300px]">Event Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Fees</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedEvents[key].map((ev: any) => (
                                    <TableRow key={ev.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-slate-800">{ev.title}</span>
                                                <span className="text-xs text-slate-400">{ev.id}</span>
                                            </div>
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
                                            <Button size="icon" variant="ghost" onClick={() => router.push(`/admin/events/edit/${ev.id}`)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(ev.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ))}
            </div>
        </div>
    );
}

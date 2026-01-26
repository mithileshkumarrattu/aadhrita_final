'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Clock, MapPin, AlignLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getEvents, addEvent, CalendarEvent } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SchedulePage() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const [events, setEvents] = React.useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    // View Details State
    const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
    const [viewDateEvents, setViewDateEvents] = React.useState<CalendarEvent[]>([]);

    // Form State
    const [newEvent, setNewEvent] = React.useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'event' as CalendarEvent['type'],
        audience: 'class' as CalendarEvent['audience']
    });

    React.useEffect(() => {
        const fetchEvents = async () => {
            if (userProfile) {
                try {
                    const classId = userProfile.semester ? `sem_${userProfile.semester}` : undefined;
                    const allEvents = await getEvents('2024-01', classId);
                    setEvents(allEvents as unknown as CalendarEvent[]);
                } catch (e) {
                    console.error("Failed to fetch events", e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchEvents();
    }, [userProfile]);

    const handleAddEvent = async () => {
        if (!userProfile) return;
        try {
            await addEvent({
                title: newEvent.title,
                date: newEvent.date,
                type: newEvent.type,
                audience: newEvent.audience,
                classId: userProfile.semester ? `sem_${userProfile.semester}` : undefined,
                createdBy: userProfile.uid
            });
            setIsDialogOpen(false);
            const classId = userProfile.semester ? `sem_${userProfile.semester}` : undefined;
            const allEvents = await getEvents('2024-01', classId);
            setEvents(allEvents as unknown as CalendarEvent[]);
        } catch (error) {
            console.error("Error adding event", error);
        }
    };

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(selectedDate);
    const daysArray = Array.from({ length: days }, (_, i) => i + 1);
    const emptySlots = Array.from({ length: firstDay }, (_, i) => i);

    const getEventsForDay = (day: number) => {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;

        return events.filter(e => e.date === dateStr);
    };

    const handleDayClick = (day: number) => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const newDate = new Date(year, month, day);
        setSelectedDate(newDate);

        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        const dayEvents = events.filter(e => e.date === dateStr);

        if (dayEvents.length > 0) {
            setViewDateEvents(dayEvents);
            setViewDialogOpen(true);
        }
    };

    const canAddEvent = userProfile?.role === 'cr' || userProfile?.role === 'admin';

    return (
        <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-black px-4 py-3 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-slate-100 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="font-black text-xl tracking-tight">Fest Schedule</div>
            </header>

            <main className="container max-w-md mx-auto px-4 mt-6">

                {/* Month Selector */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                            className="rounded-full border-2 border-black shadow-neo-sm active:shadow-none"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                            className="rounded-full border-2 border-black shadow-neo-sm active:shadow-none"
                        >
                            <ChevronLeft className="w-4 h-4 rotate-180" />
                        </Button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-8 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-xs font-bold opacity-40">{d}</div>
                    ))}

                    {emptySlots.map(i => <div key={`empty-${i}`} />)}

                    {daysArray.map(day => {
                        const dayEvents = getEventsForDay(day);
                        const hasEvent = dayEvents.length > 0;
                        const isToday = new Date().toDateString() === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day).toDateString();

                        return (
                            <div
                                key={day}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-transparent transition-all cursor-pointer relative",
                                    isToday ? "bg-black text-white shadow-neo-sm border-black" : "hover:bg-slate-100",
                                    hasEvent && !isToday ? "border-black bg-purple-50" : ""
                                )}
                            >
                                <span className={cn("text-sm font-bold", isToday ? "text-white" : "")}>{day}</span>
                                {hasEvent && (
                                    <div className="flex gap-0.5 mt-1">
                                        {dayEvents.map((ev, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full border border-black",
                                                    ev.type === 'exam' ? 'bg-red-500' : 'bg-purple-500'
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Upcoming / Selected Month Events */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg uppercase tracking-wider">Events This Month</h3>
                        {canAddEvent && (
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="rounded-full border-2 border-black shadow-neo hover:translate-y-0.5 hover:shadow-none transition-all gap-2">
                                        <Plus className="w-4 h-4" /> Add
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="border-2 border-black shadow-neo-lg rounded-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="font-black text-xl">Add New Event</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Title</Label>
                                            <Input
                                                value={newEvent.title}
                                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                className="border-2 border-black shadow-neo-sm focus-visible:ring-0"
                                                placeholder="e.g. Mid Exams"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold">Date</Label>
                                            <Input
                                                type="date"
                                                value={newEvent.date}
                                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                className="border-2 border-black shadow-neo-sm focus-visible:ring-0"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="font-bold">Type</Label>
                                                <select
                                                    className="w-full h-10 px-3 rounded-md border-2 border-black bg-white text-sm font-medium shadow-neo-sm focus:outline-none"
                                                    value={newEvent.type}
                                                    onChange={(e: any) => setNewEvent({ ...newEvent, type: e.target.value })}
                                                >
                                                    <option value="event">Event</option>
                                                    <option value="exam">Exam</option>
                                                    <option value="deadline">Deadline</option>
                                                    <option value="holiday">Holiday</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-bold">Audience</Label>
                                                <select
                                                    className="w-full h-10 px-3 rounded-md border-2 border-black bg-white text-sm font-medium shadow-neo-sm focus:outline-none"
                                                    value={newEvent.audience}
                                                    onChange={(e: any) => setNewEvent({ ...newEvent, audience: e.target.value })}
                                                >
                                                    <option value="class">My Class</option>
                                                    {userProfile?.role === 'admin' && <option value="global">Global</option>}
                                                </select>
                                            </div>
                                        </div>
                                        <Button onClick={handleAddEvent} className="w-full mt-4 border-2 border-black shadow-neo active:shadow-none">Save Event</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    {/* View Event Details Dialog */}
                    <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                        <DialogContent className="border-2 border-black shadow-neo-lg rounded-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="font-black text-xl uppercase tracking-tighter">
                                    {viewDateEvents[0] && new Date(viewDateEvents[0].date || '').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {viewDateEvents.map((ev, i) => (
                                    <div key={i} className="p-4 bg-purple-50 border-2 border-black rounded-xl">
                                        <h3 className="font-black text-lg">{ev.title}</h3>
                                        <div className="flex flex-wrap gap-3 mt-2 text-sm font-bold opacity-70">
                                            {ev.startTime && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" /> {ev.startTime}
                                                </div>
                                            )}
                                            {ev.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" /> {ev.location}
                                                </div>
                                            )}
                                        </div>
                                        {ev.description && (
                                            <p className="mt-2 text-sm opacity-80">{ev.description}</p>
                                        )}
                                        <span className="inline-block mt-2 text-[10px] uppercase font-black bg-black text-white px-2 py-0.5 rounded-full">{ev.type}</span>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <div className="space-y-3">
                        {events.length === 0 ? (
                            <div className="text-center py-10 opacity-50 font-bold">No events scheduled.</div>
                        ) : (
                            events
                                .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
                                .map((event) => (
                                    <Card key={event.id} className="p-4 border-2 border-black shadow-neo flex items-center gap-4 bg-white rounded-xl">
                                        <div className={cn(
                                            "w-12 h-12 rounded-lg border-2 border-black flex flex-col items-center justify-center shrink-0 shadow-sm",
                                            event.type === 'exam' ? 'bg-red-100' : 'bg-purple-100'
                                        )}>
                                            <span className="text-[10px] font-bold uppercase">{new Date(event.date || '').toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-lg font-black leading-none">{new Date(event.date || '').getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm truncate">{event.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full border border-black font-bold uppercase",
                                                    event.type === 'exam' ? 'bg-red-200' : 'bg-purple-200'
                                                )}>
                                                    {event.type}
                                                </span>
                                                {event.audience === 'global' && <span className="text-[10px] font-bold text-blue-600">Global</span>}
                                                {(event.startTime || event.location) && (
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-2">
                                                        {event.startTime && <span>{event.startTime}</span>}
                                                        {event.location && <span>@ {event.location}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}

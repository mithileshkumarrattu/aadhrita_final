'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EventService } from '@/services/EventService';
import { Event } from '@/lib/db';
import { Loader2, Calendar, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CoordinatorDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyEvents = async () => {
            if (!user?.email) return;

            try {
                // Fetch all events and filter client-side
                // In a production app with thousands of events, we'd use a specific query
                const allEvents = await EventService.getAllEvents();

                // Filter: User is either explicitly in 'coordinators' OR is an 'admin' (optional, but good for testing)
                const myEvents = allEvents.filter(ev =>
                    ev.coordinators?.includes(user.email!) ||
                    // Optional: Admins see all
                    // user.role === 'admin' 
                    false
                );

                setEvents(myEvents as Event[]);
            } catch (error) {
                console.error("Failed to fetch events", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyEvents();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">My Events</h1>
                <p className="text-slate-500 mt-2">Manage registrations for events assigned to you.</p>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-400 font-medium">No events assigned to you yet.</p>
                    <p className="text-sm text-slate-300 mt-2">Contact the administrator to get access.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                            {event.imagePosterUrl ? (
                                <div className="h-32 overflow-hidden bg-slate-100">
                                    <img src={event.imagePosterUrl} alt={event.title} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-3 blue-500 bg-gradient-to-r from-blue-500 to-indigo-600" />
                            )}

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                                        {event.category}
                                    </span>
                                    <h3 className="text-xl font-bold text-slate-900 mt-2 line-clamp-1">{event.title}</h3>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <Button
                                        onClick={() => router.push(`/coordinator/events/${event.id}`)}
                                        variant="ghost"
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 -ml-2 font-semibold"
                                    >
                                        View Registrations <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>

                                    {/* Valid for now, would fetch real count in detailed view */}
                                    {/* <span className="text-xs text-slate-400 font-mono">ID: {event.id}</span> */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

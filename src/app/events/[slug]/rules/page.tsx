'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db, Event } from '@/lib/db';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Users, Wallet, Trophy, Info } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';

export default function EventRulesPage() {
    const router = useRouter();
    const { slug } = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!slug) return;
            try {
                // Assuming slug is the document ID
                const docRef = doc(db, 'events', slug as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
                } else {
                    // Fallback: try querying by custom slug if we add that later, currently simple 404
                    console.error("Event not found");
                }
            } catch (error) {
                console.error("Error fetching event:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [slug]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-black"><CoinLoader /></div>;
    }

    if (!event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-900 p-4">
                <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                <Button onClick={() => router.push('/events')}>Back to Events</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 px-2 md:py-10 md:px-4 text-slate-900 font-sans">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Top Bar */}
                <div className="h-2 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600" />

                <div className="p-4 md:p-8 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <Button variant="ghost" className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent -ml-2 mb-2" onClick={() => router.back()}>
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                {event.category}
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black uppercase text-slate-900 tracking-tight mt-2">
                                {event.title}
                            </h1>
                        </div>
                        <div className="flex gap-3">
                            {/* Actions if needed */}
                        </div>
                    </div>

                    {/* Poster + Info Grid */}
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">
                            {/* Description / Rules */}
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <Info className="w-5 h-5 text-amber-600" /> About & Rules
                                </h2>
                                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </div>
                            </section>

                            {/* Additional standardized rules could go here */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                                <h3 className="font-bold text-amber-900 mb-2">Code of Conduct</h3>
                                <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">
                                    <li>Participants must carry their college ID cards.</li>
                                    <li>Decisions of the judges are final and binding.</li>
                                    <li>Malpractice or misconduct will lead to immediate disqualification.</li>
                                </ul>
                            </div>

                            {/* Resources & Coordinator Contacts */}
                            {(event.rulebookUrl || event.pptUrl || (event.coordinators && event.coordinators.length > 0)) && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Resources & Support</h3>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {event.rulebookUrl && (
                                            <a href={event.rulebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">Rulebook</div>
                                                    <div className="text-xs text-slate-500">Download PDF</div>
                                                </div>
                                            </a>
                                        )}
                                        {event.pptUrl && (
                                            <a href={event.pptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">Sample PPT</div>
                                                    <div className="text-xs text-slate-500">Presentation Template</div>
                                                </div>
                                            </a>
                                        )}
                                    </div>

                                    {event.coordinators && event.coordinators.length > 0 && (
                                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                            <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Event Coordinators</h4>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {event.coordinators.map((email, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded border border-slate-100">
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                        {email}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {event.imagePosterUrl && (
                                <div className="rounded-2xl overflow-hidden shadow-md border border-slate-100">
                                    <img src={event.imagePosterUrl} alt={event.title} className="w-full h-auto object-cover" />
                                </div>
                            )}

                            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-6 shadow-lg">
                                <div>
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Event Details</h3>
                                    <ul className="space-y-4">
                                        <li className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Users className="w-4 h-4" /> Team Size
                                            </div>
                                            <span className="font-bold">{event.minTeamSize} - {event.maxTeamSize} Members</span>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Wallet className="w-4 h-4" /> Entry Fee
                                            </div>
                                            <span className="font-bold text-green-400">₹{event.entryFeeInr}</span>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Trophy className="w-4 h-4" /> Prize Pool
                                            </div>
                                            <span className="font-bold text-amber-400">{event.entryFeeAft > 0 ? `${event.entryFeeAft} AFT` : 'TBD'}</span>
                                        </li>
                                    </ul>
                                </div>

                                <Button
                                    className="w-full bg-[#d4af37] text-black hover:bg-[#b5952f] font-bold h-12 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
                                    onClick={() => router.push(`/events/${event.id}/register`)}
                                >
                                    Register Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

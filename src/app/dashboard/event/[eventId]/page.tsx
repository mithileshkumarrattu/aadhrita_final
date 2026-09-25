'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, COLLECTIONS, Event, EventRegistration, Team } from '@/lib/db';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Calendar, MapPin, Users, Copy, CheckCircle, Shield, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';
import { toast } from 'sonner';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function EventDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.eventId as string;
    const { userProfile } = useAuth();

    const [event, setEvent] = useState<Event | null>(null);
    const [registration, setRegistration] = useState<EventRegistration | null>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userProfile?.uid || !eventId) return;

            try {
                // 1. Fetch Event Details
                const eventSnap = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));
                if (eventSnap.exists()) {
                    setEvent({ id: eventSnap.id, ...eventSnap.data() } as Event);
                } else {
                    toast.error("Event not found");
                    router.push('/dashboard');
                    return;
                }

                // 2. Fetch Registration
                // Try specific event registration subcollection first
                const qReg = query(
                    collection(db, COLLECTIONS.EVENTS, eventId, 'registrations'),
                    where('userId', '==', userProfile.uid)
                );
                const regSnap = await getDocs(qReg);

                let regData: any = null;
                if (!regSnap.empty) {
                    // CRITICAL: Filter for only 'success' or 'free' or 'completed' so we don't accidentally
                    // grab an aborted 'pending' ghost registration from multiple checkout attempts!
                    const validDocs = regSnap.docs
                        .map(d => d.data())
                        .filter(d => ['success', 'free', 'completed'].includes(d.paymentStatus || ''));

                    if (validDocs.length > 0) {
                        // Priority 1: Pick latest created valid doc
                        // Priority 2: Fallback to teamId presence 
                        validDocs.sort((a, b) => {
                            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                            if (timeB !== timeA) return timeB - timeA;
                            return (b.teamId ? 1 : 0) - (a.teamId ? 1 : 0);
                        });
                        regData = validDocs[0];
                    } else {
                        // Fallback in case none are marked success (though they shouldn't be here)
                        regData = regSnap.docs[0].data();
                    }
                    setRegistration(regData);
                } else {
                    // Fallback to searching root registrations if needed (though structure suggests nested)
                    // If not found, maybe they haven't paid or registered?
                }

                // 3. Fetch Team (if applicable)
                if (regData?.teamId) {
                    const qTeam = query(collection(db, 'teams'), where('teamId', '==', regData.teamId));
                    const teamSnap = await getDocs(qTeam);
                    if (!teamSnap.empty) {
                        const teamData = { id: teamSnap.docs[0].id, ...teamSnap.docs[0].data() } as Team;

                        // The team is confirmed if this user (who is viewing it) has a success/free registration.
                        // We preserve all team members so the full team is visible, regardless of who paid.

                        // We do not filter validPaidMembers here anymore, since one payment covers the team.

                        setTeam(teamData);
                    }
                } else if (regData?.responses?.teamName && event && (event.minTeamSize > 1 || event.maxTeamSize > 1)) {
                    // LEGACY SUPPORT: If they paid before the bug fix, they might have a teamName but NO teamId.
                    // Let's dynamically construct a Team object by querying all registrations and normalizing names.
                    const normalizeTeamName = (name: string) => (name || '').replace(/[\s-]/g, '').toLowerCase();
                    const myTeamNameNorm = normalizeTeamName(regData.responses.teamName);

                    const qVirtualTeam = query(
                        collection(db, COLLECTIONS.EVENTS, eventId, 'registrations')
                    );
                    const virtualTeamSnap = await getDocs(qVirtualTeam);

                    const validMembers = virtualTeamSnap.docs
                        .map((d: any) => ({ docId: d.id, ...d.data() }))
                        .filter((d: any) =>
                            ['success', 'free', 'completed'].includes(d.paymentStatus || '') &&
                            d.responses?.teamName &&
                            normalizeTeamName(d.responses.teamName) === myTeamNameNorm
                        );

                    if (validMembers.length > 0) {
                        // We have to guess the leader based on the role, or default to the first one
                        const leaderDoc = validMembers.find((m: any) => m.role === 'Leader') || validMembers[0];

                        const virtualTeamData: Team = {
                            id: `virtual_${regData.responses.teamName.replace(/\s+/g, '_')}`,
                            teamId: 'LEGACY_TEAM_NO_CODE',
                            eventId: eventId,
                            teamName: regData.responses.teamName,
                            leaderId: leaderDoc.userId,
                            leaderName: leaderDoc.responses?.teamName || 'Leader',
                            status: 'locked', // No code means no joining
                            createdAt: regData.createdAt,
                            maxSize: event.maxTeamSize,
                            members: await Promise.all(validMembers.map(async (m: any) => {
                                // We might need their real name from 'users' collection, but as a fallback:
                                let name = 'Student';
                                let regNo = 'N/A';
                                try {
                                    const uSnap = await getDoc(doc(db, 'users', m.userId));
                                    if (uSnap.exists()) {
                                        const uData = uSnap.data();
                                        name = uData.fullName || uData.name || 'Student';
                                        regNo = uData.registrationNumber || 'N/A';
                                    }
                                } catch (e) { }

                                return {
                                    userId: m.userId,
                                    name: name,
                                    regNo: regNo
                                };
                            })),
                            memberIds: validMembers.map((m: any) => m.userId)
                        };

                        setTeam(virtualTeamData);
                    }
                }

            } catch (error) {
                console.error("Error fetching details:", error);
                toast.error("Failed to load details");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userProfile, eventId]);

    const copyTeamId = () => {
        if (team?.teamId) {
            navigator.clipboard.writeText(team.teamId);
            toast.success("Team ID copied to clipboard!");
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    if (!event) return null;

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-800 px-4 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="font-bold text-lg truncate">{event.title}</div>
            </div>

            <main className="max-w-3xl mx-auto p-4 space-y-6">

                {/* Event Hero Card */}
                <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                    {event.imagePosterUrl ? (
                        <img src={event.imagePosterUrl} className="w-full h-48 md:h-64 object-cover opacity-60" />
                    ) : (
                        <div className="w-full h-32 bg-zinc-800" />
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Confirmed
                            </span>
                            {registration?.role && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                                    {registration.role}
                                </span>
                            )}
                        </div>
                        <h1 className={cn("text-2xl md:text-3xl font-black text-white uppercase leading-tight", cinzel.className)}>
                            {event.title}
                        </h1>
                    </div>
                </div>

                {/* Team Section (Crucial Requirement) */}
                {team ? (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[60px]" />

                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-yellow-500 font-bold uppercase tracking-widest text-xs mb-1">Team Access</h2>
                                <p className="text-2xl font-bold text-white">{team.teamName}</p>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-right">
                                <p className="text-[10px] text-zinc-500 font-medium uppercase mb-1">Team ID</p>
                                <div className="flex items-center gap-2" onClick={copyTeamId}>
                                    <code className="text-xl font-mono font-bold text-green-400 cursor-pointer hover:text-green-300">
                                        {team.teamId}
                                    </code>
                                    <Copy className="w-4 h-4 text-zinc-500 cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Team Members ({team.memberIds?.length || 0}/{event.maxTeamSize || 1})
                        </h3>
                        {/* Minimum Member Warning */}
                        {(team.memberIds?.length || 0) < (event.minTeamSize || 1) && (
                            <div className="bg-amber-900/20 border border-amber-500/30 p-2 rounded flex items-center gap-2 text-xs text-amber-500 mt-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>Team requires minimum {event.minTeamSize} members.</span>
                            </div>
                        )}
                        <div className="grid gap-2 mt-2">
                            {team.members?.map((member: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400">
                                            {member.name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{member.name}</p>
                                            <p className="text-xs text-zinc-500">{member.regNo}</p>
                                        </div>
                                    </div>
                                    {member.userId === team.leaderId && (
                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20">
                                            Leader
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center">
                        <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-zinc-400 text-sm">
                            {event?.minTeamSize > 1 ? "Team Assigned (Processing)" : "Individual Registration"}
                        </p>
                    </div>
                )}

                {/* Event Specifics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Schedule</span>
                        </div>
                        <p className="text-white font-medium">
                            {event.date ? (
                                <span className="block">
                                    {event.date}
                                    {event.time && <span className="text-zinc-400 ml-2 text-sm">at {event.time}</span>}
                                </span>
                            ) : (
                                event.schedule || "To be Announced"
                            )}
                        </p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Venue</span>
                        </div>
                        <p className="text-white font-medium">{event.venue || "To be Announced"}</p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                    <p className="text-sm text-blue-200">
                        Need help? <span className="underline cursor-pointer" onClick={() => router.push('/support')}>Contact Support</span>
                    </p>
                </div>

            </main >
        </div >
    );
}

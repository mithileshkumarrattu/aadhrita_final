'use client';

import React from 'react';
import { Event, EventResponseData } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DynamicForm } from '@/components/events/DynamicForm';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ... (existing imports)
import { TeamMemberInput } from '@/lib/db';

interface EventRegistrationCardProps {
    event: Event;
    response: EventResponseData;
    onUpdate: (field: keyof EventResponseData, value: any) => void;
    onUpdateCustom: (field: string, value: any) => void;
    onMemberChange: (index: number, field: string, value: string) => void;
    onAddMember: () => void;
    onRemoveMember: (index: number) => void;
}

export function EventRegistrationCard({
    event,
    response,
    onUpdate,
    onUpdateCustom,
    onMemberChange,
    onAddMember,
    onRemoveMember
}: EventRegistrationCardProps) {
    // Force rebuild: Dark Mode Applied
    const config = event.formConfig || {};
    const requiredMembers = (event.minTeamSize || 1) - 1;
    const maxAdditional = event.maxTeamSize ? event.maxTeamSize - 1 : 3;

    // Local state for loading status of specific members being synced
    const [syncingIndex, setSyncingIndex] = React.useState<number | null>(null);

    const handleDynamicFormSet = (updater: any) => {
        const current = response.customResponses || {};
        const newState = updater(current);
        onUpdate('customResponses', newState);
    };

    const syncMemberDetails = async (index: number, regNo: string) => {
        if (!regNo || regNo.length < 5) {
            toast.error("Enter a valid Reg No first");
            return;
        }

        setSyncingIndex(index);
        try {
            const q = query(collection(db, 'users'), where('regNo', '==', regNo));
            const snap = await getDocs(q);

            if (snap.empty) {
                toast.error("User not found or not onboarded yet.");
                // Optionally clear fields or mark error
                onMemberChange(index, 'name', '');
                onMemberChange(index, 'phone', '');
                // You might want to update a 'status' field if you have one
            } else {
                const userData = snap.docs[0].data();
                onMemberChange(index, 'name', userData.fullName || '');
                onMemberChange(index, 'phone', userData.mobileNumber || '');
                // Assuming onMemberChange can handle arbitrary fields or we need to update the interface
                // We'll trust the parent to handle 'idCardUrl' if passed, or we cast.
                // Since the parent manages state, we just bubble up the change.
                onMemberChange(index, 'idCardUrl', userData.idCardUrl || '');

                toast.success(`Found: ${userData.fullName}`);
            }
        } catch (e) {
            console.error("Sync error", e);
            toast.error("Failed to fetch details");
        } finally {
            setSyncingIndex(null);
        }
    };


    return (

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-white">{event.title}</h3>
                <div className="bg-white/10 border border-white/20 text-neutral-300 text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">
                    {event.minTeamSize > 1 ? `Team Event (${event.minTeamSize}-${event.maxTeamSize})` : 'Additional Details'}
                </div>
            </div>

            <div className="p-6 space-y-6">

                {/* Resources & Schedule */}
                {(event.rulebookUrl || event.pptUrl || event.schedule || event.venue) && (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-3 h-3" /> Event Details & Resources
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            {(event.schedule || event.venue) && (
                                <div className="space-y-1">
                                    {event.schedule && <div className="text-sm text-neutral-300 font-medium">🕒 {event.schedule}</div>}
                                    {event.venue && <div className="text-sm text-neutral-300 font-medium">📍 {event.venue}</div>}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {event.rulebookUrl && (
                                    <a href={event.rulebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-900/40 border border-yellow-700/50 rounded-md text-xs font-bold text-yellow-500 hover:bg-yellow-900/60 transition-colors shadow-sm">
                                        📄 Rulebook
                                    </a>
                                )}
                                {event.pptUrl && (
                                    <a href={event.pptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 border border-red-700/50 rounded-md text-xs font-bold text-red-400 hover:bg-red-900/60 transition-colors shadow-sm">
                                        📊 Sample PPT
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 1. Team Logic */}
                {(event.maxTeamSize > 1 || event.minTeamSize > 1) && (
                    <div className="space-y-6">
                        {/* Action Toggle */}
                        <div className="flex items-center justify-between bg-amber-900/20 p-4 rounded-xl border border-amber-700/30">
                            <div>
                                <h4 className="text-sm font-bold text-amber-500">Team Participation</h4>
                                <p className="text-xs text-amber-600/80 mt-1">
                                    {response.isTeamLeader ? "You are creating a new team." : "You are joining an existing team."}
                                </p>
                            </div>
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        onUpdate('isTeamLeader', true);
                                        onUpdate('teamId', ''); // Clear ID if creating
                                    }}
                                    className={cn("h-8 text-xs font-bold rounded-md transition-all hover:bg-white/10 hover:text-white", response.isTeamLeader ? "bg-amber-600/20 text-amber-500 shadow-sm border border-amber-500/30" : "text-neutral-500")}
                                >
                                    Create Team
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        onUpdate('isTeamLeader', false);
                                        onUpdate('teamName', ''); // Clear Name if joining
                                    }}
                                    className={cn("h-8 text-xs font-bold rounded-md transition-all hover:bg-white/10 hover:text-white", !response.isTeamLeader ? "bg-amber-600/20 text-amber-500 shadow-sm border border-amber-500/30" : "text-neutral-500")}
                                >
                                    Join Team
                                </Button>
                            </div>
                        </div>

                        {/* Logic Content */}
                        {response.isTeamLeader ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300 font-semibold text-sm">Team Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={response.teamName || ''}
                                        onChange={(e) => onUpdate('teamName', e.target.value)}
                                        placeholder="Enter a unique Team Name"
                                        className="bg-black/40 border-white/10 focus:border-amber-500/50 transition-colors text-white font-medium placeholder:text-neutral-600"
                                    />
                                </div>
                                <div className="bg-blue-900/20 text-blue-300 text-xs p-4 rounded-lg border border-blue-500/30 space-y-2">
                                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-400">
                                        <AlertCircle className="w-4 h-4" /> How it works
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 ml-1 opacity-80">
                                        <li>You create the team by setting a <strong>Team Name</strong>.</li>
                                        <li>Proceed to payment to finalize your registration.</li>
                                        <li>After payment, you will receive a unique <strong>Team ID</strong>.</li>
                                        <li><strong>Share this Team ID</strong> with your team members (limited) so they can join.</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300 font-semibold text-sm">Team ID <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={response.teamId || ''}
                                        onChange={(e) => onUpdate('teamId', e.target.value.toUpperCase())}
                                        placeholder="Enter Team ID (e.g., TEAM-TITANS-2026)"
                                        className="bg-black/40 border-white/10 focus:border-amber-500/50 transition-colors text-white font-mono uppercase placeholder:text-neutral-600"
                                    />
                                </div>
                                <div className="bg-green-900/20 text-green-300 text-xs p-4 rounded-lg border border-green-500/30 space-y-2">
                                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-green-400">
                                        <CheckCircle2 className="w-4 h-4" /> Instructions
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 ml-1 opacity-80">
                                        <li>Ask your Team Leader for the <strong>Team ID</strong>.</li>
                                        <li>Enter the ID above to verify your team.</li>
                                        <li>Proceed to payment to confirm your spot.</li>
                                        <li>You will be <strong>automatically added</strong> to the team upon success.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Dynamic Questions (Only for Individual or Team Leader) */}
                {/* Logic: If it's a team event (>1) and user is NOT leader, skip questions. Else show. */}
                {!(event.minTeamSize > 1 && !response.isTeamLeader) && (
                    <div className={cn("space-y-4", event.minTeamSize > 1 && "pt-4 border-t border-white/10")}>
                        <DynamicForm
                            config={{ ...config, askTeamName: false }} // Disable standard team name since we handled it
                            formData={response.customResponses || {}}
                            setFormData={handleDynamicFormSet}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}

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
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">{event.title}</h3>
                <div className="bg-white border border-gray-200 text-gray-700 text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">
                    {event.minTeamSize > 1 ? `Team Event (${event.minTeamSize}-${event.maxTeamSize})` : 'Additional Details'}
                </div>
            </div>

            <div className="p-6 space-y-6">

                {/* Resources & Schedule */}
                {(event.rulebookUrl || event.pptUrl || event.schedule || event.venue) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-3 h-3" /> Event Details & Resources
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            {(event.schedule || event.venue) && (
                                <div className="space-y-1">
                                    {event.schedule && <div className="text-sm text-slate-700 font-medium">🕒 {event.schedule}</div>}
                                    {event.venue && <div className="text-sm text-slate-700 font-medium">📍 {event.venue}</div>}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {event.rulebookUrl && (
                                    <a href={event.rulebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 border border-yellow-400 rounded-md text-xs font-bold text-yellow-800 hover:bg-yellow-200 transition-colors shadow-sm">
                                        📄 Rulebook
                                    </a>
                                )}
                                {event.pptUrl && (
                                    <a href={event.pptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shadow-sm">
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
                        <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Team Participation</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    {response.isTeamLeader ? "You are creating a new team." : "You are joining an existing team."}
                                </p>
                            </div>
                            <div className="flex bg-white rounded-lg p-1 border border-amber-200 gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        onUpdate('isTeamLeader', true);
                                        onUpdate('teamId', ''); // Clear ID if creating
                                    }}
                                    className={cn("h-8 text-xs font-bold rounded-md transition-all", response.isTeamLeader ? "bg-amber-100 text-amber-900 shadow-sm" : "text-gray-500 hover:text-amber-800")}
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
                                    className={cn("h-8 text-xs font-bold rounded-md transition-all", !response.isTeamLeader ? "bg-amber-100 text-amber-900 shadow-sm" : "text-gray-500 hover:text-amber-800")}
                                >
                                    Join Team
                                </Button>
                            </div>
                        </div>

                        {/* Logic Content */}
                        {response.isTeamLeader ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-semibold text-sm">Team Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={response.teamName || ''}
                                        onChange={(e) => onUpdate('teamName', e.target.value)}
                                        placeholder="Enter a unique Team Name"
                                        className="bg-white border-gray-300 focus:border-amber-500 transition-colors text-gray-900 font-medium"
                                    />
                                </div>
                                <div className="bg-blue-50 text-blue-900 text-xs p-4 rounded-lg border border-blue-100 space-y-2">
                                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-700">
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
                                    <Label className="text-gray-700 font-semibold text-sm">Team ID <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={response.teamId || ''}
                                        onChange={(e) => onUpdate('teamId', e.target.value.toUpperCase())}
                                        placeholder="Enter Team ID (e.g., TEAM-TITANS-2026)"
                                        className="bg-white border-gray-300 focus:border-amber-500 transition-colors text-gray-900 font-mono uppercase"
                                    />
                                </div>
                                <div className="bg-green-50 text-green-900 text-xs p-4 rounded-lg border border-green-100 space-y-2">
                                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-green-700">
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
                    <div className={cn("space-y-4", event.minTeamSize > 1 && "pt-4 border-t border-gray-100")}>
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

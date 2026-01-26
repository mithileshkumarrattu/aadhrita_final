'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event } from '@/lib/db';
import { EventService } from '@/services/EventService';
import { EventInput } from '@/lib/schemas/event.schema';
import { uploadFile } from '@/lib/storage';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UploadCloud, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Seeder from './Seeder';
import { FormFieldConfig } from '@/lib/db';
import { RoyalFormBuilder } from '@/components/admin/RoyalFormBuilder';
import { DynamicForm } from '@/components/events/DynamicForm';

export default function CreateEventPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);


    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        category: 'Flagship', // Better default? Or 'Tech Frontier'
        imagePosterUrl: '',
        description: '',
        minTeamSize: 1,
        maxTeamSize: 1,
        entryFeeInr: 0,
        entryFeeAft: 0,
        formConfig: {
            askTeamName: false,
            askPptUrl: false,
            askSoundReqs: false,
            askRobotSpecs: false,
            customFields: []
        }
    });



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting Create Event Form...", formData);

        if (!formData.title || !formData.description) {
            toast.error("Please fill required fields (Title & Description)");
            return;
        }

        setLoading(true);
        try {
            // DIRECTLY USE URL from formData
            const eventInput: any = {
                ...formData,
                minTeamSize: formData.minTeamSize || 1,
                maxTeamSize: formData.maxTeamSize || 1,
                entryFeeInr: formData.entryFeeInr || 0,
                entryFeeAft: formData.entryFeeAft || 0,
                schedule: formData.schedule || '',
                venue: formData.venue || '',
                formConfig: formData.formConfig || { askTeamName: false, askPptUrl: false }
            };

            console.log("Sending Payload:", eventInput);
            await EventService.createEvent(eventInput);

            toast.success("Event Created Successfully!");
            router.push('/admin/events');
        } catch (error: any) {
            console.error("Create Event Failure:", error);
            if (error.issues) {
                toast.error(`Validation Error: ${error.issues[0].message}`);
            } else {
                toast.error(error.message || "Failed to submit event. Check console.");
            }
        } finally {
            setLoading(false);
        }
    };

    const preventSubmitOnEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') e.preventDefault();
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-900">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 gap-2" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" /> Back to Events
                </Button>
                <div className="hidden md:block">
                    <Seeder />
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white">
                        <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
                        <p className="text-slate-400 mt-1">Configure details, custom rules, and registration form.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-10">
                        {/* 1. Basic Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">Step 1</span>
                                <h3 className="text-lg font-bold text-slate-800">Basic Details</h3>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Event Title <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Robo Wars 2.0"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        onKeyDown={preventSubmitOnEnter}
                                        required
                                        className="font-medium text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Category <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EVENT_CATEGORIES.map(cat => (
                                                <SelectItem key={cat.id} value={cat.label}>{cat.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 font-semibold">Description <span className="text-red-500">*</span></Label>
                                <textarea
                                    className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] focus:bg-white transition-all"
                                    placeholder="Describe the event, rules, and expectations..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 font-semibold">Event Poster URL</Label>
                                <Input
                                    placeholder="https://i.imgur.com/..."
                                    value={formData.imagePosterUrl}
                                    onChange={e => setFormData({ ...formData, imagePosterUrl: e.target.value })}
                                    className="bg-slate-50 border-slate-200"
                                    onKeyDown={preventSubmitOnEnter}
                                />
                                <p className="text-xs text-slate-400">Paste a direct image link (optional)</p>
                            </div>
                        </div>

                        {/* 2. Fees */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">Step 2</span>
                                <h3 className="text-lg font-bold text-slate-800">Economics & Team Config</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Entry Fee (INR)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                                        <Input
                                            type="number"
                                            className="pl-8 bg-slate-50 border-slate-200"
                                            value={formData.entryFeeInr}
                                            onChange={e => setFormData({ ...formData, entryFeeInr: parseInt(e.target.value) || 0 })}
                                            onKeyDown={preventSubmitOnEnter}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Reward (AFT)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">A</span>
                                        <Input
                                            type="number"
                                            className="pl-8 bg-slate-50 border-slate-200"
                                            value={formData.entryFeeAft}
                                            onChange={e => setFormData({ ...formData, entryFeeAft: parseInt(e.target.value) || 0 })}
                                            onKeyDown={preventSubmitOnEnter}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg bg-white">
                                            <Checkbox
                                                id="isTeamEvent"
                                                checked={formData.minTeamSize! > 1 || formData.maxTeamSize! > 1}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFormData({ ...formData, minTeamSize: 2, maxTeamSize: 4 });
                                                    } else {
                                                        setFormData({ ...formData, minTeamSize: 1, maxTeamSize: 1 });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor="isTeamEvent" className="text-slate-700 font-semibold cursor-pointer">
                                                Is this a Team Event?
                                            </Label>
                                        </div>

                                        {(formData.minTeamSize! > 1 || formData.maxTeamSize! > 1) && (
                                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-600 font-semibold">Min Members</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        className="bg-slate-50 border-slate-200"
                                                        value={formData.minTeamSize}
                                                        onChange={e => setFormData({ ...formData, minTeamSize: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-600 font-semibold">Max Members</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        className="bg-slate-50 border-slate-200"
                                                        value={formData.maxTeamSize}
                                                        onChange={e => setFormData({ ...formData, maxTeamSize: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2.5 Resources & Coordinators */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">Step 2.5</span>
                                <h3 className="text-lg font-bold text-slate-800">Resources & Access</h3>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Rulebook URL (PDF)</Label>
                                    <Input
                                        placeholder="https://drive.google.com/..."
                                        value={formData.rulebookUrl || ''}
                                        onChange={e => setFormData({ ...formData, rulebookUrl: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                        onKeyDown={preventSubmitOnEnter}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Sample PPT URL</Label>
                                    <Input
                                        placeholder="https://docs.google.com/..."
                                        value={formData.pptUrl || ''}
                                        onChange={e => setFormData({ ...formData, pptUrl: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                        onKeyDown={preventSubmitOnEnter}
                                    />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Schedule (e.g. 10:00 AM)</Label>
                                    <Input
                                        placeholder="e.g. 14th Feb, 10:00 AM"
                                        value={formData.schedule || ''}
                                        onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                        onKeyDown={preventSubmitOnEnter}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 font-semibold">Venue (e.g. Room 304)</Label>
                                    <Input
                                        placeholder="e.g. Main Auditorium"
                                        value={formData.venue || ''}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                        onKeyDown={preventSubmitOnEnter}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 font-semibold">Event Coordinators (Emails)</Label>
                                <Input
                                    placeholder="student1@mvgr.edu, faculty@mvgr.edu"
                                    // We'll manage this as a joined string in state for simplicity in this form
                                    value={formData.coordinators?.join(', ') || ''}
                                    onChange={e => setFormData({ ...formData, coordinators: e.target.value.split(',').map(s => s.trim()) })}
                                    className="bg-slate-50 border-slate-200"
                                    onKeyDown={preventSubmitOnEnter}
                                />
                                <p className="text-xs text-slate-400">Comma-separated emails of users who can manage this event.</p>
                            </div>
                        </div>

                        {/* 3. Form Config */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">Step 3</span>
                                <h3 className="text-lg font-bold text-slate-800">Registration Form Customization</h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {[
                                    { id: 'askTeamName', label: 'Ask Team Name' },
                                    { id: 'askPptUrl', label: 'Ask PPT Link' },
                                    { id: 'askSoundReqs', label: 'Sound Requirements' },
                                    { id: 'askRobotSpecs', label: 'Robot Specs' },
                                ].map((field) => (
                                    <div key={field.id}
                                        onClick={() => setFormData({
                                            ...formData,
                                            formConfig: { ...formData.formConfig!, [field.id]: !formData.formConfig?.[field.id as keyof typeof formData.formConfig] }
                                        })}
                                        className={`
                                            cursor-pointer px-4 py-3 rounded-lg border text-sm font-semibold transition-all select-none flex items-center justify-between
                                            ${formData.formConfig?.[field.id as keyof typeof formData.formConfig]
                                                ? 'border-slate-800 bg-slate-800 text-white shadow-md transform scale-105'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100'}
                                        `}
                                    >
                                        {field.label}
                                        {formData.formConfig?.[field.id as keyof typeof formData.formConfig] && <div className="w-2 h-2 rounded-full bg-green-400 ml-2" />}
                                    </div>
                                ))}
                            </div>

                            <RoyalFormBuilder
                                fields={formData.formConfig?.customFields as FormFieldConfig[] || []}
                                onChange={(newFields) => setFormData({
                                    ...formData,
                                    formConfig: { ...formData.formConfig!, customFields: newFields }
                                })}
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <Button
                                type="submit"
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-14 text-lg font-bold shadow-lg transition-all"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                Create Event
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

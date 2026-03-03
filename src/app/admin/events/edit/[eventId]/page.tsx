'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event } from '@/lib/db';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { uploadFile } from '@/lib/storage';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UploadCloud, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormFieldConfig } from '@/lib/db';
import { RoyalFormBuilder } from '@/components/admin/RoyalFormBuilder';

export default function EditEventPage() {
    const router = useRouter();
    const { eventId } = useParams();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        category: 'Flagship',
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

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;
            try {
                const docRef = doc(db, 'events', eventId as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Event;
                    setFormData(data);
                    if (data.imagePosterUrl) {
                        setPosterPreview(data.imagePosterUrl);
                    }
                } else {
                    toast.error("Event not found");
                    router.push('/admin/events');
                }
            } catch (error) {
                console.error("Error fetching event:", error);
                toast.error("Failed to load event");
            } finally {
                setFetching(false);
            }
        };

        fetchEvent();
    }, [eventId, router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPosterFile(file);
            setPosterPreview(URL.createObjectURL(file));
        }
    };

    const preventSubmitOnEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') e.preventDefault();
    };

    // Generic Helper to remove undefined values recursively
    const removeUndefined = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(removeUndefined);
        if (obj !== null && typeof obj === 'object') {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = removeUndefined(value);
                }
                return acc;
            }, {} as any);
        }
        return obj;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            toast.error("Please fill required fields");
            return;
        }

        setLoading(true);
        try {
            // Default to parsed existing URL or empty string (never undefined)
            let posterUrl = formData.imagePosterUrl || '';

            if (posterFile && user) {
                try {
                    // Fix: Append timestamp to ensure unique filename and avoid caching issues
                    const safeTitle = formData.title!.replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `${safeTitle}_${Date.now()}`;
                    posterUrl = await uploadFile(posterFile, user.uid, fileName, 'events', 'image');
                } catch (uploadError) {
                    console.error("Poster upload failed", uploadError);
                    toast.error("Poster upload failed, keeping old one.");
                }
            }

            const rawUpdateData: any = {
                ...formData,
                imagePosterUrl: posterUrl,
                minTeamSize: formData.minTeamSize || 1,
                maxTeamSize: formData.maxTeamSize || 1,
                entryFeeInr: formData.entryFeeInr || 0,
                entryFeeAft: formData.entryFeeAft || 0,
                schedule: formData.schedule || '',
                venue: formData.venue || '',
                formConfig: formData.formConfig || { askTeamName: false, askPptUrl: false }
            };

            // Remove ID if present
            delete rawUpdateData.id;

            // Deep Sanitize
            const cleanedData = removeUndefined(rawUpdateData);

            await updateDoc(doc(db, 'events', eventId as string), cleanedData);

            toast.success("Event Updated Successfully!");
            router.push('/admin/events');
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update event: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-900">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 gap-2" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" /> Back to Events
                </Button>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Edit Event</h1>
                            <p className="text-slate-400 mt-1">Update details and configuration.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8" onKeyDown={preventSubmitOnEnter}>
                        {/* Basic Info */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b pb-2">Basic Info</h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Event Title *</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select
                                        value={EVENT_CATEGORIES.some(c => c.label === formData.category) ? formData.category : 'Custom'}
                                        onValueChange={(val: string) => {
                                            if (val === 'Custom') {
                                                setFormData({ ...formData, category: '' }); // Clear for custom entry
                                            } else {
                                                setFormData({ ...formData, category: val });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EVENT_CATEGORIES.map(cat => (
                                                <SelectItem key={cat.label} value={cat.label}>{cat.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Custom Category Input */}
                                    {(!EVENT_CATEGORIES.some(c => c.label === formData.category) || formData.category === '' || formData.category === 'Custom') && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                            <Input
                                                placeholder="Type Custom Category..."
                                                value={formData.category === 'Custom' ? '' : formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="bg-white border-slate-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description *</Label>
                                <textarea
                                    className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Event Poster</Label>
                                <div className="flex gap-6 items-start">
                                    <div
                                        onClick={() => document.getElementById('poster-upload')?.click()}
                                        className="w-32 h-40 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200 hover:border-slate-400 transition-colors overflow-hidden relative"
                                    >
                                        {posterPreview ? (
                                            <img src={posterPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                                                <span className="text-xs text-slate-500">Upload</span>
                                            </>
                                        )}
                                        <input
                                            id="poster-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </div>
                                    <div className="text-sm text-slate-500 pt-2">
                                        <p>Recommended: 1080x1350px (4:5)</p>
                                        <p>Max size: 5MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2.5 Resources & Coordinators */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b pb-2">Resources & Access</h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Rulebook URL (Optional)</Label>
                                    <Input
                                        value={formData.rulebookUrl || ''}
                                        onChange={e => setFormData({ ...formData, rulebookUrl: e.target.value })}
                                        placeholder="Drive Link / PDF URL"
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sample PPT URL (Optional)</Label>
                                    <Input
                                        value={formData.pptUrl || ''}
                                        onChange={e => setFormData({ ...formData, pptUrl: e.target.value })}
                                        placeholder="Template Link"
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Schedule (Display Text)</Label>
                                    <Input
                                        value={formData.schedule || ''}
                                        onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                                        placeholder="e.g. 14th Feb, 10:00 AM"
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Venue</Label>
                                    <Input
                                        value={formData.venue || ''}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                        placeholder="e.g. Main Auditorium"
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Event Coordinators (Emails)</Label>
                                <Input
                                    placeholder="student1@mvgr.edu, faculty@mvgr.edu"
                                    value={formData.coordinators?.join(', ') || ''}
                                    onChange={e => setFormData({ ...formData, coordinators: e.target.value.split(',').map(s => s.trim()) })}
                                    className="bg-slate-50 border-slate-200"
                                />
                                <p className="text-xs text-slate-400">Comma-separated emails.</p>
                            </div>
                        </div>

                        {/* Logistics & Registration */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b pb-2">Logistics & Registration</h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.date || ''}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input
                                        type="time"
                                        value={formData.time || ''}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 items-center">
                                <div className="space-y-2">
                                    <Label>Registration Mode</Label>
                                    <Select
                                        value={formData.registrationMode || 'online'}
                                        onValueChange={(val: any) => setFormData({ ...formData, registrationMode: val })}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Select Mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="online">Online Registration</SelectItem>
                                            <SelectItem value="offline">Offline Only (Spot)</SelectItem>
                                            <SelectItem value="none">Closed / Info Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center space-x-2 border p-3 rounded-lg bg-white h-full mt-6">
                                    <input
                                        type="checkbox"
                                        id="isOpen"
                                        checked={formData.isRegistrationOpen !== false} // Default true
                                        onChange={(e) => setFormData({ ...formData, isRegistrationOpen: e.target.checked })}
                                        className="accent-slate-900 w-5 h-5 cursor-pointer"
                                    />
                                    <Label htmlFor="isOpen" className="text-slate-700 font-semibold cursor-pointer select-none">
                                        Registration Open?
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Rules & Fees */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b pb-2">Rules & Fees</h2>

                            <div className="border p-6 rounded-xl bg-slate-50 space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="isTeamEvent"
                                        checked={(formData.maxTeamSize || 1) > 1 || formData.formConfig?.askTeamName}
                                        onCheckedChange={(checked: boolean) => {
                                            if (checked) {
                                                setFormData({
                                                    ...formData,
                                                    minTeamSize: 1,
                                                    maxTeamSize: 4,
                                                    formConfig: { ...formData.formConfig!, askTeamName: true }
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    minTeamSize: 1,
                                                    maxTeamSize: 1,
                                                    formConfig: { ...formData.formConfig!, askTeamName: false }
                                                });
                                            }
                                        }}
                                        className="w-5 h-5 border-slate-400 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                    />
                                    <div>
                                        <Label htmlFor="isTeamEvent" className="text-slate-900 font-bold text-base cursor-pointer">
                                            Enable Team Registration?
                                        </Label>
                                        <p className="text-slate-500 text-sm">Check this if multiple students participate as a group.</p>
                                    </div>
                                </div>

                                {/* Conditionally Render Team Inputs */}
                                {(formData.formConfig?.askTeamName || (formData.maxTeamSize || 1) > 1) && (
                                    <div className="grid grid-cols-2 gap-4 pl-8 animate-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-semibold">Min Members</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="bg-white border-slate-300"
                                                value={formData.minTeamSize}
                                                onChange={e => setFormData({ ...formData, minTeamSize: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-semibold">Max Members</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="bg-white border-slate-300"
                                                value={formData.maxTeamSize}
                                                onChange={e => setFormData({ ...formData, maxTeamSize: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Entry Fee (₹)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.entryFeeInr}
                                        onChange={e => setFormData({ ...formData, entryFeeInr: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Entry Fee (AFT)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.entryFeeAft}
                                        onChange={e => setFormData({ ...formData, entryFeeAft: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Builder */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b pb-2 flex items-center justify-between">
                                <span>Registration Form Config</span>
                                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Royal Form Builder</span>
                            </h2>

                            <div className="grid md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-4 h-4 text-emerald-600" />
                                    <Label className="cursor-pointer flex-1" htmlFor="chk-team">Ask Team Name?</Label>
                                    <input
                                        type="checkbox" id="chk-team"
                                        checked={formData.formConfig?.askTeamName}
                                        onChange={e => setFormData({ ...formData, formConfig: { ...formData.formConfig!, askTeamName: e.target.checked } })}
                                        className="accent-emerald-600 w-4 h-4"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-4 h-4 text-blue-600" />
                                    <Label className="cursor-pointer flex-1" htmlFor="chk-ppt">Ask PPT URL?</Label>
                                    <input
                                        type="checkbox" id="chk-ppt"
                                        checked={formData.formConfig?.askPptUrl}
                                        onChange={e => setFormData({ ...formData, formConfig: { ...formData.formConfig!, askPptUrl: e.target.checked } })}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                </div>
                            </div>

                            {/* Royal Form Builder Component */}
                            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-inner">
                                <div className="mb-4">
                                    <h3 className="text-white font-bold mb-1">Custom Questions</h3>
                                    <p className="text-slate-400 text-sm">Drag and drop to reorder questions.</p>
                                </div>
                                <RoyalFormBuilder
                                    fields={formData.formConfig?.customFields || []}
                                    onChange={(newFields: FormFieldConfig[]) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            formConfig: { ...prev.formConfig!, customFields: newFields }
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="px-8 font-bold">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Update Event
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

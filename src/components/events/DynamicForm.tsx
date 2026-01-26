'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFormConfig } from '@/lib/db';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadFile } from '@/lib/storage'; // Import uploadFile
import { Loader2, Info } from 'lucide-react'; // Import Loader, Info icon

interface DynamicFormProps {
    config: EventFormConfig;
    formData: any;
    setFormData: (data: any) => void;
}

export function DynamicForm({ config, formData, setFormData }: DynamicFormProps) {
    if (!config) return null;

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const [uploadingField, setUploadingField] = React.useState<string | null>(null);

    const handleFileUpload = async (field: string, file: File) => {
        try {
            setUploadingField(field);
            const downloadURL = await uploadFile(file, `dynamic_uploads/${field}`);
            handleChange(field, downloadURL);
        } catch (error) {
            console.error("Upload failed", error);
            // Optionally toast error here
        } finally {
            setUploadingField(null);
        }
    };

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-2">
            {/* Standard Configured Fields */}
            {config.askTeamName && (
                <div className="space-y-2">
                    <Label className="text-slate-700">Team Name <span className="text-red-500">*</span></Label>
                    <Input
                        placeholder="Enter your team name"
                        value={formData.teamName || ''}
                        onChange={(e) => handleChange('teamName', e.target.value)}
                        required
                        className="bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black"
                    />
                </div>
            )}

            {config.askPptUrl && (
                <div className="space-y-2">
                    <Label className="text-slate-700">Presentation URL <span className="text-red-500">*</span></Label>
                    <Input
                        placeholder="Google Drive / Canva Link"
                        value={formData.pptUrl || ''}
                        onChange={(e) => handleChange('pptUrl', e.target.value)}
                        required
                        className="bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black"
                    />
                    <p className="text-xs text-slate-500">Ensure link is publicly accessible.</p>
                </div>
            )}

            {config.askSoundReqs && (
                <div className="space-y-2">
                    <Label className="text-slate-700">Sound/Track Requirements</Label>
                    <Input
                        placeholder="Describe tracks or instruments needed"
                        value={formData.soundReqs || ''}
                        onChange={(e) => handleChange('soundReqs', e.target.value)}
                        className="bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black"
                    />
                </div>
            )}

            {config.askRobotSpecs && (
                <div className="space-y-2">
                    <Label className="text-slate-700">Robot Specifications</Label>
                    <Input
                        placeholder="Weight, Dimensions, Weaponry"
                        value={formData.robotSpecs || ''}
                        onChange={(e) => handleChange('robotSpecs', e.target.value)}
                        className="bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black"
                    />
                </div>
            )}

            {/* Custom Fields Loop */}
            {config.customFields?.map((field) => (
                <div key={field.id} className="space-y-2">
                    <Label className="text-slate-700">{field.label} {field.required && <span className="text-red-500">*</span>}</Label>

                    {field.type === 'textarea' ? (
                        <Textarea
                            placeholder={field.placeholder || `Enter ${field.label}`}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            required={field.required}
                            className="bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black min-h-[100px]"
                        />
                    ) : field.type === 'select' ? (
                        <Select
                            value={formData[field.id] || ''}
                            onValueChange={(val) => handleChange(field.id, val)}
                            required={field.required}
                        >
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900 focus:ring-black">
                                <SelectValue placeholder={field.placeholder || "Select an option"} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-900">
                                {field.options?.map((opt, idx) => (
                                    <SelectItem key={idx} value={opt} className="hover:bg-slate-100">{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : field.type === 'file' ? (
                        <div className="space-y-2">
                            <Input
                                type="file"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFileUpload(field.id, e.target.files[0]);
                                }}
                                required={field.required && !formData[field.id]} // Only required if no value present
                                className="bg-white border-slate-200 text-slate-900 file:bg-slate-100 file:text-slate-700 file:border-0 file:rounded-md file:mr-4 file:px-4 file:font-semibold hover:file:bg-slate-200"
                                disabled={uploadingField === field.id}
                            />
                            {uploadingField === field.id && (
                                <div className="flex items-center gap-2 text-xs text-amber-600">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                                </div>
                            )}
                            {formData[field.id] && (typeof formData[field.id] === 'string') && (
                                <div className="text-xs text-green-600 font-medium truncate">
                                    File Uploaded: ...{formData[field.id].slice(-20)}
                                </div>
                            )}
                        </div>
                    ) : field.type === 'checkbox' ? (
                        <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
                            <Checkbox
                                id={field.id}
                                checked={!!formData[field.id]}
                                onCheckedChange={(checked) => handleChange(field.id, checked)}
                                required={field.required}
                                className="mt-1 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:border-[#D4AF37] border-slate-300"
                            />
                            <Label htmlFor={field.id} className="text-sm text-slate-800 leading-relaxed cursor-pointer font-medium">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </Label>
                        </div>
                    ) : field.type === 'info' ? (
                        <div className="bg-blue-50 text-blue-900 text-sm p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
                            <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold text-blue-800">{field.label}</p>
                                {field.placeholder && <p className="whitespace-pre-wrap opacity-90 text-blue-700/80">{field.placeholder}</p>}
                            </div>
                        </div>
                    ) : (
                        // Default Text
                        <Input
                            type="text"
                            placeholder={field.placeholder || `Enter ${field.label}`}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            required={field.required}
                            className="bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black"
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

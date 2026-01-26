'use client';

import * as React from 'react';
import { EventFormConfig, UserRegistration } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UploadCloud, CheckCircle } from 'lucide-react';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

interface Props {
    config: EventFormConfig;
    userProfile: UserRegistration;
    onSubmit: (data: any) => Promise<void>;
    submitting: boolean;
}

export function DynamicRegistrationForm({ config, userProfile, onSubmit, submitting }: Props) {
    const [formData, setFormData] = React.useState<Record<string, any>>({});
    const [uploading, setUploading] = React.useState<string | null>(null);

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(key);
            try {
                const url = await uploadFile(e.target.files[0], userProfile.userId, `event_doc_${key}`, 'event_docs', 'auto');
                handleChange(key, url);
                toast.success("File Uploaded");
            } catch (error) {
                toast.error("Upload failed");
            } finally {
                setUploading(null);
            }
        }
    };

    const handleSubmit = () => {
        // Basic Validation
        const missingFields = [];
        if (config.askTeamName && !formData.teamName) missingFields.push("Team Name");
        if (config.askPptUrl && !formData.pptUrl) missingFields.push("PPT URL");

        config.customFields?.forEach(field => {
            if (field.required && !formData[field.id]) missingFields.push(field.label);
        });

        if (missingFields.length > 0) {
            toast.error(`Please fill: ${missingFields.join(', ')}`);
            return;
        }

        onSubmit(formData);
    };

    return (
        <div className="space-y-6">
            {/* Read-Only Profile Context */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-neutral-400 text-xs uppercase tracking-wider font-semibold">Registering As</h3>
                    <p className={cn("text-[#D4AF37] font-bold text-lg", cinzel.className)}>{userProfile.fullName}</p>
                    <p className="text-neutral-500 text-sm">{userProfile.collegeName}</p>
                </div>
                <div className="h-10 w-10 bg-green-900/20 rounded-full flex items-center justify-center text-green-500 border border-green-800">
                    <CheckCircle className="w-5 h-5" />
                </div>
            </div>

            {/* Standard Fields */}
            {config.askTeamName && (
                <div className="space-y-2">
                    <Label className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Team Name <span className="text-[#D4AF37]">*</span></Label>
                    <Input
                        className="bg-black/40 border-white/10 text-white focus:border-[#D4AF37]/50"
                        placeholder="ENTER TEAM NAME"
                        value={formData.teamName || ''}
                        onChange={(e) => handleChange('teamName', e.target.value)}
                    />
                </div>
            )}

            {/* Custom Fields */}
            {config.customFields?.map((field) => (
                <div key={field.id} className="space-y-2">
                    <Label className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">
                        {field.label} {field.required && <span className="text-[#D4AF37]">*</span>}
                    </Label>

                    {/* Render based on Type */}
                    {field.type === 'text' && (
                        <Input
                            className="bg-black/40 border-white/10 text-white focus:border-[#D4AF37]/50"
                            placeholder={field.placeholder}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                        />
                    )}

                    {field.type === 'select' && (
                        <Select onValueChange={(val) => handleChange(field.id, val)}>
                            <SelectTrigger className="bg-black/40 border-white/10 text-white">
                                <SelectValue placeholder={`Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-white/10 text-white">
                                {field.options?.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {field.type === 'file' && (
                        <div className="border border-dashed border-white/20 rounded-lg p-4 flex items-center justify-center bg-black/20 hover:bg-[#D4AF37]/5 transition-colors cursor-pointer relative">
                            {formData[field.id] ? (
                                <span className="text-green-500 text-sm font-bold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> File Attached
                                </span>
                            ) : uploading === field.id ? (
                                <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                            ) : (
                                <div className="text-center">
                                    <UploadCloud className="w-6 h-6 text-neutral-500 mx-auto mb-1" />
                                    <span className="text-xs text-neutral-400">Click to Upload</span>
                                </div>
                            )}
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, field.id)}
                            />
                        </div>
                    )}
                </div>
            ))}

            <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#D4AF37] text-black font-bold hover:bg-[#B8860B] py-6 text-lg tracking-widest uppercase shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
            >
                {submitting ? <Loader2 className="animate-spin" /> : "CONFIRM REGISTRATION"}
            </Button>
        </div>
    );
}

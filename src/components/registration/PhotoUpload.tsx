'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
    userId: string;
    userName: string;
    currentUrl?: string;
    onUpload: (url: string) => void;
}

export function PhotoUpload({ userId, userName, currentUrl, onUpload }: PhotoUploadProps) {
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validation (Size < 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB");
                return;
            }

            setLoading(true);
            try {
                // Optimistic Preview
                const objectUrl = URL.createObjectURL(file);
                setPreview(objectUrl);

                // Upload
                const downloadUrl = await uploadFile(file, userId, userName, 'profile_photos', 'image');
                onUpload(downloadUrl);
                toast.success("Profile Photo Uploaded!");
            } catch (error) {
                console.error(error);
                toast.error("Upload failed. Please try again.");
                setPreview(currentUrl || null); // Revert
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className={cn(
                    "relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-100 shadow-xl overflow-hidden group cursor-pointer bg-gray-50 flex items-center justify-center transition-all hover:border-red-200",
                    loading && "opacity-70 pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
            >
                {preview ? (
                    <Image
                        src={preview}
                        alt="Profile"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <Camera className="w-12 h-12 text-gray-300 group-hover:text-red-400 transition-colors" />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-8 h-8 text-white" />
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                >
                    {preview ? "Change Photo" : "Upload Photo"}
                </Button>
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide font-medium">
                    Selfie / Portrait • Max 5MB
                </p>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
        </div>
    );
}

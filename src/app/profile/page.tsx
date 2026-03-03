'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, LogOut, Camera, Phone, Mail, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function ProfilePage() {
    const router = useRouter();
    const { userProfile, logout, user } = useAuth();
    const [uploading, setUploading] = React.useState(false);

    // Profile Image Upload
    const photoInputRef = React.useRef<HTMLInputElement>(null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !user || !userProfile) return;
        const file = e.target.files[0];
        setUploading(true);

        try {
            // Upload to Storage
            // Fix: Generate Unique Filename to avoid caching/collisions
            const uniqueSuffix = Date.now();
            const safeReg = (userProfile.registrationNumber || user.uid).replace(/[^a-zA-Z0-9]/g, '_');
            const fileNamePrefix = `${safeReg}_${uniqueSuffix}_PHOTO`;

            // Pass 'profiles' as the folder override if needed, though lib handles it
            const url = await uploadFile(file, user.uid, fileNamePrefix, 'profiles', 'image');

            // Update Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                photoURL: url, // Standardized field
                photoUrl: url  // Sync legacy field just in case
            });

            toast.success("Profile photo updated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        if (confirm("Are you sure you want to log out?")) {
            await logout();
            router.replace('/');
        }
    };

    if (!userProfile) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-2xl mx-auto p-4 md:p-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 text-neutral-400 hover:text-white pl-0 hover:bg-transparent"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer mb-4" onClick={() => photoInputRef.current?.click()}>
                        <div className={cn("w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl bg-black relative", uploading && "opacity-50")}>
                            {userProfile.photoURL ? (
                                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                    <User className="w-16 h-16" />
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                            <Camera className="w-6 h-6" />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-red-600 rounded-full p-2 border-4 border-zinc-950 shadow-sm">
                            <Camera className="w-4 h-4 text-white" />
                        </div>
                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </div>

                    <h1 className={cn("text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400", cinzel.className)}>
                        {userProfile.fullName}
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm mt-1">{userProfile.registrationNumber}</p>

                    <div className="mt-4 flex gap-2">
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                            {userProfile.branch}
                        </span>
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                            Year {userProfile.yearOfStudy || 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="bg-zinc-900/50 border-white/5 p-6 backdrop-blur-md">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Official Contact Info</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-neutral-400 text-xs">Email Address</Label>
                                    <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                                        <Mail className="w-4 h-4 text-neutral-500" />
                                        <span className="text-sm font-medium">{userProfile.email}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-neutral-400 text-xs">Mobile Number</Label>
                                    <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                                        <Phone className="w-4 h-4 text-neutral-500" />
                                        <span className="text-sm font-medium">{userProfile.mobileNumber || 'Not set'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-amber-900/10 border-amber-900/30 p-6">
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Event Support
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <a href="tel:+918888888888" className="flex items-center gap-3 p-4 bg-amber-950/30 rounded-xl border border-amber-900/30 hover:bg-amber-900/40 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Phone className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-amber-400/80 font-bold uppercase">Technical Support</p>
                                    <p className="text-sm font-bold text-amber-100">+91 88888 88888</p>
                                </div>
                            </a>
                            <a href="mailto:support@aadhrita.com" className="flex items-center gap-3 p-4 bg-amber-950/30 rounded-xl border border-amber-900/30 hover:bg-amber-900/40 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Mail className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-amber-400/80 font-bold uppercase">General Queries</p>
                                    <p className="text-sm font-bold text-amber-100">support@aadhrita.com</p>
                                </div>
                            </a>
                        </div>
                    </Card>

                    <Button
                        onClick={handleLogout}
                        className="w-full h-14 bg-zinc-900 hover:bg-red-950/30 hover:text-red-500 hover:border-red-900/50 border border-zinc-800 text-neutral-400 font-bold rounded-xl mt-4 transition-all"
                    >
                        <LogOut className="w-5 h-5 mr-2" /> Log Out
                    </Button>

                    <p className="text-[10px] text-center text-zinc-700 font-mono pt-4">
                        User ID: {user?.uid} • v2.1.0 • Aadhrita 2026
                    </p>
                </div>
            </div>
        </div>
    );
}

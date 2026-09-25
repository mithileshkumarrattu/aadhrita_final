'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, LogOut, Camera, Phone, Mail, Shield, User } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
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

    const [isEditingName, setIsEditingName] = React.useState(false);
    const [editedName, setEditedName] = React.useState('');

    React.useEffect(() => {
        if (userProfile?.fullName) {
            setEditedName(userProfile.fullName);
        }
    }, [userProfile?.fullName]);

    const handleSaveName = async () => {
        if (!user || !editedName.trim() || editedName.trim() === userProfile?.fullName) {
            setIsEditingName(false);
            return;
        }
        setUploading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: editedName.trim()
            });
            toast.success("Name updated successfully!");
            setIsEditingName(false);
            // Optional: call refreshProfile() if needed, or assume it will sync via onSnapshot or next load
        } catch (error) {
            console.error(error);
            toast.error("Failed to update name");
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

    if (!userProfile) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-2xl mx-auto p-4 md:p-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="mb-6 text-neutral-400 hover:text-white pl-0 hover:bg-transparent"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
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

                    {isEditingName ? (
                        <div className="flex items-center gap-2 mb-1">
                            <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="bg-zinc-900 border-zinc-700 text-white h-10 text-center font-bold text-lg"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleSaveName} disabled={uploading} className="h-10 bg-red-600 hover:bg-red-700 text-white px-4">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setEditedName(userProfile.fullName); }} className="h-10">Cancel</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 cursor-pointer group mb-1" onClick={() => setIsEditingName(true)}>
                                <h1 className={cn("text-3xl font-bold text-white group-hover:text-red-400 transition-colors", cinzel.className)}>
                                    {userProfile.fullName}
                                </h1>
                                <User className="w-4 h-4 text-neutral-500 group-hover:text-red-400 transition-colors" />
                            </div>
                            <Button
                                variant="link"
                                size="sm"
                                onClick={() => setIsEditingName(true)}
                                className="text-[10px] text-neutral-500 hover:text-red-400 p-0 h-auto uppercase tracking-widest font-bold"
                            >
                                Edit Name
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="bg-zinc-900/50 border-white/5 p-6 backdrop-blur-md">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Official Contact Info</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                                    <div className="flex items-center gap-3 p-4 bg-zinc-900/80 rounded-xl border border-white/10 text-white shadow-inner">
                                        <Mail className="w-5 h-5 text-red-500" />
                                        <span className="text-sm font-bold tracking-tight">{userProfile.email}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Mobile Number</Label>
                                    <div className="flex items-center gap-3 p-4 bg-zinc-900/80 rounded-xl border border-white/10 text-white shadow-inner">
                                        <Phone className="w-5 h-5 text-red-500" />
                                        <span className="text-sm font-bold tracking-tight">{userProfile.mobileNumber || 'Not provided'}</span>
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
                            <a href="tel:+919010432006" className="flex items-center gap-3 p-4 bg-amber-950/30 rounded-xl border border-amber-900/30 hover:bg-amber-900/40 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Phone className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-400/80 font-bold uppercase pb-1 leading-tight">STUDENT CO-ORDINATOR</p>
                                    <p className="text-sm font-bold text-amber-100">+91 90104 32006</p>
                                </div>
                            </a>
                            <a href="mailto:support.aadhrita@mvgrce.edu.in" className="flex items-center gap-3 p-4 bg-amber-950/30 rounded-xl border border-amber-900/30 hover:bg-amber-900/40 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Mail className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-400/80 font-bold uppercase pb-1 leading-tight">General Queries</p>
                                    <p className="text-xs font-bold text-amber-100 break-all pr-2">support.aadhrita@mvgrce.edu.in</p>
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
                </div>
            </div>
        </div>
    );
}

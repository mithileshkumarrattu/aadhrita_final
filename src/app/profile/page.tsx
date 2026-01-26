'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    CreditCard,
    Receipt
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, X, Edit2, LogOut } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { userProfile, logout } = useAuth();

    const [isEditing, setIsEditing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [formData, setFormData] = React.useState({ fullName: '', photoURL: '' });

    React.useEffect(() => {
        if (userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                photoURL: userProfile.photoURL || ''
            });
        }
    }, [userProfile]);

    const handleSave = async () => {
        if (!userProfile?.uid) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', userProfile.uid), {
                fullName: formData.fullName,
                photoURL: formData.photoURL
            });
            setIsEditing(false);
        } catch (e) {
            console.error("Profile update failed", e);
            alert("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-xl font-bold">Account</h1>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" : "hover:bg-slate-100"}
                >
                    {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </Button>
            </div>

            <div className="container max-w-md mx-auto px-4 mt-2">
                {/* Edit Form or Display Card */}
                {isEditing ? (
                    <div className="bg-white p-6 rounded-[24px] border-2 border-black shadow-neo mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                            Edit Profile <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full border border-black transform -rotate-2">Public</span>
                        </h2>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-500 uppercase text-xs">Full Name</Label>
                                <Input
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Your Name"
                                    className="border-2 border-slate-200 focus-visible:ring-black h-11 font-bold rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-500 uppercase text-xs">Profile Image URL</Label>
                                <Input
                                    value={formData.photoURL}
                                    onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                                    placeholder="https://imgur.com/..."
                                    className="border-2 border-slate-200 focus-visible:ring-black h-11 font-mono text-xs rounded-xl"
                                />
                                <p className="text-[10px] text-slate-400 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    💡 Tip: Use a direct link to an image (ending in .jpg/png) from Imgur, Google Drive (public), or Discord.
                                </p>
                            </div>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-12 font-bold bg-black text-white hover:bg-slate-800 border-2 border-black shadow-sm rounded-xl text-sm"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Card className="border-2 border-black shadow-neo bg-slate-900 text-white rounded-[24px] p-8 mb-8 flex flex-col items-center relative overflow-hidden transition-all duration-300">
                        <div className="relative mb-4 rounded-full overflow-hidden w-28 h-28 border-4 border-white bg-slate-800 flex items-center justify-center shrink-0 shadow-lg group">
                            <Avatar className="w-full h-full rounded-none bg-transparent">
                                {userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <AvatarFallback className="bg-transparent text-5xl font-bold text-white">
                                        {userProfile?.fullName?.[0] || 'S'}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                        </div>

                        <div className="z-10 text-center relative">
                            <h2 className="text-2xl font-black uppercase mb-1 tracking-wide leading-tight">
                                {userProfile?.fullName || 'Student'}
                            </h2>
                            <p className="text-sm opacity-60 font-mono mb-4">
                                {userProfile?.registrationNumber}
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                                {userProfile?.branch} • SEM {userProfile?.semester} • {userProfile?.section}
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
                    </Card>
                )}

                {/* My Registrations Section */}
                <div className="mb-8">
                    <h3 className="font-black text-sm uppercase tracking-wider mb-4 opacity-50 px-2">My Registrations</h3>
                    <RegistrationsList userUid={userProfile?.uid} />
                </div>

                {/* Additional Info / Actions */}
                <div className="space-y-4">
                    <Card className="p-5 border-2 border-black shadow-neo rounded-[20px] bg-white">
                        <h3 className="font-black text-sm uppercase tracking-wider mb-4 opacity-50">Academic ID</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                                <span className="text-slate-500 font-bold">Email</span>
                                <span className="font-bold text-slate-900 truncate max-w-[200px]">{userProfile?.email}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                                <span className="text-slate-500 font-bold">Joined</span>
                                <span className="font-bold text-slate-900">{userProfile?.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                                <span className="text-slate-500 font-bold">Role</span>
                                <span className="font-bold text-indigo-600 uppercase text-xs bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{userProfile?.role || 'STUDENT'}</span>
                            </div>
                        </div>
                    </Card>

                    <Button
                        variant="destructive"
                        className="w-full font-bold rounded-xl mt-4 bg-red-500 hover:bg-red-600 border-2 border-red-700 text-white shadow-sm"
                        onClick={async () => {
                            if (confirm("Are you sure you want to logout?")) {
                                await logout();
                                router.replace('/');
                            }
                        }}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log Out
                    </Button>

                    <div className="pt-4 flex justify-center">
                        <p className="text-[10px] font-bold text-slate-400">MVGR Student Portal v1.0.4</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RegistrationsList({ userUid }: { userUid?: string }) {
    const [registrations, setRegistrations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!userUid) return;
        const fetchRegistrations = async () => {
            // Use collectionGroup query to find all registrations for this user across all events
            // Note: Requires Firestore Index (userId ASC/DESC) usually, but simple equality often works without custom index if single field.
            try {
                const { collectionGroup, query, where, getDocs, getDoc, doc } = await import('firebase/firestore');
                const q = query(collectionGroup(db, 'registrations'), where('userId', '==', userUid));
                const querySnapshot = await getDocs(q);

                const regs = await Promise.all(querySnapshot.docs.map(async (regDoc) => {
                    const data = regDoc.data();
                    // Fetch event details for display
                    let eventTitle = 'Unknown Event';
                    let eventDate = null;
                    try {
                        const eventSnap = await getDoc(doc(db, 'events', data.eventId));
                        if (eventSnap.exists()) {
                            const eventData = eventSnap.data();
                            eventTitle = eventData.title;
                            eventDate = eventData.date;
                        }
                    } catch (e) { console.error("Event fetch fail", e) }

                    return {
                        id: regDoc.id,
                        ...data,
                        eventTitle,
                        eventDate
                    };
                }));
                setRegistrations(regs);
            } catch (e) {
                console.error("Failed to fetch registrations", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRegistrations();
    }, [userUid]);

    if (loading) return <div className="p-4 text-center text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /> Loading Registrations...</div>;

    if (registrations.length === 0) return (
        <Card className="p-6 border-2 border-dashed border-slate-200 bg-slate-50 text-center rounded-xl">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-500">No Registrations Yet</p>
            <p className="text-xs text-slate-400">Join an event to see it here!</p>
        </Card>
    );

    return (
        <div className="space-y-3">
            {registrations.map(reg => (
                <Card key={reg.id} className="p-4 border-2 border-black bg-white shadow-sm rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-colors">
                    <div>
                        <h4 className="font-bold text-slate-900 leading-tight">{reg.eventTitle}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${reg.paymentStatus === 'success'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : reg.paymentStatus === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                {reg.paymentStatus === 'success' ? 'PAID' : reg.paymentStatus?.toUpperCase() || 'REGISTERED'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {reg.createdAt?.seconds ? new Date(reg.createdAt.seconds * 1000).toLocaleDateString() : ''}
                            </span>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

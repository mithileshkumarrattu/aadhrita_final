'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminContentPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const [posterUrl, setPosterUrl] = useState('');
    const [hackathonTitle, setHackathonTitle] = useState(''); // New State
    const [hackathonDescription, setHackathonDescription] = useState(''); // New State
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || userProfile?.role !== 'admin')) {
            router.replace('/');
        } else if (user && userProfile?.role === 'admin') {
            fetchContent();
        }
    }, [user, userProfile, loading]);

    const fetchContent = async () => {
        try {
            const docRef = doc(db, 'cms_content', 'home_page');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPosterUrl(data.posterUrl || '');
                setHackathonTitle(data.hackathonTitle || '');
                setHackathonDescription(data.hackathonDescription || '');
            }
        } catch (error) {
            console.error("Error fetching content:", error);
            toast.error("Failed to load content.");
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Validate URL roughly
            if (posterUrl && !posterUrl.startsWith('http')) {
                toast.error("Please enter a valid URL (https://...)");
                return;
            }

            await setDoc(doc(db, 'cms_content', 'home_page'), {
                posterUrl: posterUrl,
                hackathonTitle: hackathonTitle,
                hackathonDescription: hackathonDescription,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.email
            }, { merge: true });

            toast.success("Home Page Poster Updated!");
        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || isLoadingData) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Content Management</h1>
                    <p className="text-muted-foreground">Manage dynamic content for the landing page.</p>
                </div>
            </div>

            <div className="grid gap-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Home Page Poster</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6"> {/* Increased spacing */}
                        {/* Title Input */}
                        <div className="space-y-2">
                            <Label>Hackathon Card Title (HTML Supported)</Label>
                            <Input
                                value={hackathonTitle}
                                onChange={(e) => setHackathonTitle(e.target.value)}
                                placeholder='Build.<br /> <span class="text-red-600">Code.</span><br /> Conquer.'
                            />
                            <p className="text-xs text-gray-400">Use &lt;br /&gt; for line breaks and &lt;span&gt; for styling.</p>
                        </div>

                        {/* Description Input */}
                        <div className="space-y-2">
                            <Label>Hackathon Description</Label>
                            <Input
                                value={hackathonDescription}
                                onChange={(e) => setHackathonDescription(e.target.value)}
                                placeholder="Join the most prestigious 24-hour hackathon..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Poster Image URL</Label>
                            <Input
                                value={posterUrl}
                                onChange={(e) => setPosterUrl(e.target.value)}
                                placeholder="https://..."
                            />
                            <p className="text-xs text-gray-500">
                                Provide a direct link to the image (e.g. from Google Drive, Imgur, or Firebase Storage).
                                <br />The image fetching won't be limited or cropped, ensuring original size loads to support all aspect ratios.
                            </p>
                        </div>

                        {posterUrl && (
                            <div className="mt-4 p-2 border rounded-xl bg-gray-50">
                                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Preview</p>
                                <img src={posterUrl} alt="Preview" className="w-full h-auto max-h-[400px] object-contain rounded-lg" />
                            </div>
                        )}

                        <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white">
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Content
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

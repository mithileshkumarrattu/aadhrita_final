'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { collection, getDocs, deleteDoc, doc, orderBy, query, addDoc, updateDoc } from 'firebase/firestore';
import { uploadFile } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Plus, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

interface Poster {
    id?: string;
    imageUrl: string;
    order: number;
    createdAt?: any;
}

export default function AdminPostersPage() {
    const { user } = useAuth();
    const [posters, setPosters] = useState<Poster[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newPoster, setNewPoster] = useState<Partial<Poster>>({
        imageUrl: '', order: 0
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    const fetchPosters = async () => {
        try {
            const q = query(collection(db, 'landing_carousel'), orderBy('order', 'asc'));
            const snap = await getDocs(q);
            setPosters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poster)));
        } catch (e) {
            console.error(e);
            toast.error("Failed to load posters");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosters();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this poster?")) return;
        await deleteDoc(doc(db, 'landing_carousel', id));
        fetchPosters();
        toast.success("Poster deleted");
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        setSubmitting(true);
        try {
            let url = newPoster.imageUrl || '';
            if (imageFile && user) {
                // Using a generic name like 'poster_<timestamp>' since we don't have a poster name
                const fileName = `poster_${Date.now()}`;
                url = await uploadFile(imageFile, user.uid, fileName, 'carousel', 'image');
            }

            if (!url) {
                toast.error("Please provide an Image URL or Upload an Image");
                setSubmitting(false);
                return;
            }

            await addDoc(collection(db, 'landing_carousel'), {
                imageUrl: url,
                order: Number(newPoster.order) || 0,
                createdAt: new Date()
            });
            toast.success("Poster Added");
            setIsCreating(false);
            setImageFile(null);
            setNewPoster({ imageUrl: '', order: 0 });
            fetchPosters();
        } catch (e) {
            console.error(e);
            toast.error("Failed to add poster");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Landing Carousel</h1>
                    <p className="text-slate-500">Manage posters shown on the home page.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)} className={isCreating ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-black text-white hover:bg-neutral-800"}>
                    {isCreating ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Poster</>}
                </Button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 animate-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Label>Display Order</Label>
                                <Input type="number" value={newPoster.order} onChange={e => setNewPoster({ ...newPoster, order: Number(e.target.value) })} placeholder="0" />
                                <p className="text-xs text-slate-400">Lower numbers appear first.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Select Image (Optional upload)</Label>
                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                    />
                                    <UploadCloud className="w-8 h-8 mb-2" />
                                    <span className="text-sm font-medium">{imageFile ? imageFile.name : 'Click to Upload'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Or Paste Image URL</Label>
                            <Input
                                placeholder="https://..."
                                value={newPoster.imageUrl || ''}
                                onChange={e => setNewPoster({ ...newPoster, imageUrl: e.target.value })}
                            />

                            {/* Preview */}
                            <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 relative">
                                {(newPoster.imageUrl || imageFile) ? (
                                    <Image
                                        src={newPoster.imageUrl || (imageFile ? URL.createObjectURL(imageFile) : '')}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-xs text-slate-400">Preview</span>
                                )}
                            </div>

                            <Button type="submit" disabled={submitting} className="w-full bg-black text-white">{submitting ? <Loader2 className="animate-spin" /> : 'Save Poster'}</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="w-24">Order</TableHead>
                            <TableHead>Preview</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posters.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">No posters yet</TableCell></TableRow> :
                            posters.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-mono text-slate-400 font-bold text-lg">#{p.order}</TableCell>
                                    <TableCell>
                                        <div className="w-32 h-20 rounded-lg bg-slate-100 overflow-hidden relative border border-slate-200 shadow-sm">
                                            {p.imageUrl ? <Image src={p.imageUrl} alt="Poster" fill className="object-cover" /> : <ImageIcon className="w-5 h-5 m-auto text-slate-400" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-xs text-slate-500 font-mono select-all">{p.imageUrl}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(p.id!)}><Trash2 className="w-4 h-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

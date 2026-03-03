'use client';

import React, { useEffect, useState } from 'react';
import { db, TeamMember } from '@/lib/db'; // Import TeamMember
import { collection, getDocs, deleteDoc, doc, orderBy, query, addDoc, updateDoc } from 'firebase/firestore';
import { uploadFile } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Plus, UploadCloud, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminTeamPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Form State
    const [isCreating, setIsCreating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newMember, setNewMember] = useState<Partial<TeamMember>>({
        name: '', role: '', category: 'Core Team', imageUrl: '', order: 0
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    const fetchMembers = async () => {
        try {
            const q = query(collection(db, 'team_members'), orderBy('order', 'asc'));
            const snap = await getDocs(q);
            setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
        } catch (e) {
            console.error(e);
            toast.error("Failed to load members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this member?")) return;
        await deleteDoc(doc(db, 'team_members', id));
        fetchMembers();
        toast.success("Member deleted");
    };

    const handleEdit = (member: TeamMember) => {
        setNewMember(member);
        setEditingId(member.id!);
        setIsCreating(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMember.name || !newMember.role) return toast.error("Name and Role required");

        setSubmitting(true);
        try {
            let url = newMember.imageUrl || '';
            if (imageFile && user) {
                // Fix: Append timestamp to ensure unique filename and avoid caching issues
                const safeName = newMember.name!.replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `${safeName}_${Date.now()}`;
                url = await uploadFile(imageFile, user.uid, fileName, 'team', 'image');
            }

            const memberData = {
                ...newMember,
                imageUrl: url,
                order: Number(newMember.order) || 0,
                // Only update createdAt if it's new, otherwise keep it or update updatedAt
                ...(editingId ? { updatedAt: new Date() } : { createdAt: new Date() })
            };

            if (editingId) {
                await updateDoc(doc(db, 'team_members', editingId), memberData);
                toast.success("Member Updated");
            } else {
                await addDoc(collection(db, 'team_members'), memberData);
                toast.success("Member Added");
            }

            setIsCreating(false);
            setEditingId(null);
            setImageFile(null);
            setNewMember({ name: '', role: '', category: 'Core Team', imageUrl: '', order: 0 });
            fetchMembers();
        } catch (e) {
            console.error(e);
            toast.error("Failed to save member");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Faces of Aadhrita</h1>
                    <p className="text-slate-500">Manage team members and display order.</p>
                </div>
                <Button onClick={() => { setIsCreating(!isCreating); setEditingId(null); setNewMember({ name: '', role: '', category: 'Core Team', imageUrl: '', order: 0 }); }} className={isCreating ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-black text-white hover:bg-neutral-800"}>
                    {isCreating ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Member</>}
                </Button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 animate-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Label>Name *</Label>
                                <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="e.g. John Doe" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Role *</Label>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newMember.role}
                                        onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                        placeholder="e.g. Organizer (Use Enter for new lines)"
                                    />
                                </div>
                                <div>
                                    <Label>Designation (Optional)</Label>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newMember.designation || ''}
                                        onChange={e => setNewMember({ ...newMember, designation: e.target.value })}
                                        placeholder="e.g. Dean, HOD (Use Enter for new lines)"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Category (Group) *</Label>
                                    <Input
                                        value={newMember.category}
                                        onChange={e => setNewMember({ ...newMember, category: e.target.value })}
                                        placeholder="Type or paste (e.g. Chief Patron)"
                                        list="category-suggestions"
                                    />
                                    <datalist id="category-suggestions">
                                        <option value="Chief Patron" />
                                        <option value="Patron" />
                                        <option value="Convener" />
                                        <option value="Co-Conveners" />
                                        <option value="Faculty Coordinators" />
                                        <option value="Student Coordinators" />
                                        <option value="Core Team" />
                                    </datalist>
                                </div>
                                <div>
                                    <Label>Display Order</Label>
                                    <Input type="number" value={newMember.order} onChange={e => setNewMember({ ...newMember, order: Number(e.target.value) })} placeholder="0" />
                                </div>
                            </div>

                            <div>
                                <Label>Phone Number (Optional)</Label>
                                <Input value={newMember.phone || ''} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} placeholder="+91..." />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label>Photo URL</Label>
                            <Input
                                placeholder="Paste image link (e.g. Drive/Cloudinary)"
                                value={newMember.imageUrl || ''}
                                onChange={e => setNewMember({ ...newMember, imageUrl: e.target.value })}
                            />
                            <p className="text-xs text-slate-400">Or use upload (if implemented) or just paste a direct link.</p>
                            <Button type="submit" disabled={submitting} className="w-full bg-black text-white">{submitting ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Member' : 'Save Member')}</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead>Order</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No members yet</TableCell></TableRow> :
                            members.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-mono text-slate-400">{m.order || 0}</TableCell>
                                    <TableCell className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative">
                                            {m.imageUrl ? <Image src={m.imageUrl} alt={m.name} fill className="object-cover" /> : <Users className="w-5 h-5 m-2.5 text-slate-400" />}
                                        </div>
                                        <span className="font-bold">{m.name}</span>
                                    </TableCell>
                                    <TableCell>{m.role}</TableCell>
                                    <TableCell><span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-bold uppercase text-slate-500">{m.category}</span></TableCell>
                                    <TableCell className="text-right">
                                        <Button size="icon" variant="ghost" className="text-blue-500 hover:bg-blue-50 mr-2" onClick={() => handleEdit(m)}><Pencil className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(m.id!)}><Trash2 className="w-4 h-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </div>
        </div >
    )
}

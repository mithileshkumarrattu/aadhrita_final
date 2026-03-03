'use client';

import React, { useState, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { useCategories, Category } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Loader2, GripVertical, Save, RefreshCw, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminCategoriesPage() {
    const { categories: initialCategories, loading, updateCategories } = useCategories();
    const [items, setItems] = useState<Category[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [currentCat, setCurrentCat] = useState<Category | null>(null); // Null for new, Object for edit

    useEffect(() => {
        if (!loading) {
            setItems(initialCategories);
        }
    }, [loading, initialCategories]);

    const handleReorder = (newOrder: Category[]) => {
        setItems(newOrder);
        setHasChanges(true);
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            await updateCategories(items);
            setHasChanges(false);
        } catch (e) {
            // Toast handled in hook
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure? This will remove the category from the list. Events with this category will fall into 'Other'.")) {
            const newItems = items.filter(i => i.id !== id);
            setItems(newItems);
            setHasChanges(true);
        }
    };

    const handleSaveCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentCat) return;

        let newItems = [...items];

        if (items.some(i => i.id === currentCat.id)) {
            // Edit existing
            newItems = newItems.map(i => i.id === currentCat.id ? currentCat : i);
        } else {
            // Add New
            if (items.some(i => i.id === currentCat.id)) {
                toast.error("ID already exists!");
                return;
            }
            newItems.push(currentCat);
        }

        setItems(newItems);
        setHasChanges(true);
        setIsEditOpen(false);
        setCurrentCat(null);
    };

    const openNewModal = () => {
        setCurrentCat({
            id: '',
            label: '',
            description: '',
            image: ''
        });
        setIsEditOpen(true);
    };

    const openEditModal = (cat: Category) => {
        setCurrentCat({ ...cat });
        setIsEditOpen(true);
    }


    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Category Management</h1>
                    <p className="text-slate-500 mt-1">Drag to reorder how categories appear on the Onboarding page.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setItems(initialCategories)} disabled={!hasChanges || isSaving}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button onClick={openNewModal} variant="secondary">
                        <Plus className="w-4 h-4 mr-2" /> Add New
                    </Button>
                    <Button onClick={handleSaveOrder} disabled={!hasChanges || isSaving} className={cn("transition-all", hasChanges ? "bg-emerald-600 hover:bg-emerald-700" : "")}>
                        {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-3 max-w-3xl mx-auto">
                {items.map((item) => (
                    <Reorder.Item key={item.id} value={item} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-500/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-4">
                            <div className="p-2 text-slate-400 group-hover:text-blue-500 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{item.label}</h3>
                                <p className="text-xs text-slate-500 font-mono">{item.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}><Edit className="w-4 h-4 text-slate-500" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            {/* Edit/Add Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{items.some(i => i.id === currentCat?.id) ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                        <DialogDescription>
                            Define category details. ID must be unique and URL-friendly.
                        </DialogDescription>
                    </DialogHeader>
                    {currentCat && (
                        <form onSubmit={handleSaveCategory} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cat-id">ID (Unique)</Label>
                                <Input
                                    id="cat-id"
                                    value={currentCat.id}
                                    onChange={(e) => setCurrentCat({ ...currentCat, id: e.target.value })}
                                    disabled={items.some(i => i.id === currentCat.id && i !== currentCat)} // Only disable if strictly editing? Actually allow ID edit for new only usually, but let's allow flexibility for now or just trust user.
                                    placeholder="e.g. tech-frontier"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cat-label">Label (Display Name)</Label>
                                <Input
                                    id="cat-label"
                                    value={currentCat.label}
                                    onChange={(e) => setCurrentCat({ ...currentCat, label: e.target.value })}
                                    placeholder="e.g. Tech Frontier Challenges"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cat-desc">Description</Label>
                                <Textarea
                                    id="cat-desc"
                                    value={currentCat.description}
                                    onChange={(e) => setCurrentCat({ ...currentCat, description: e.target.value })}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Done</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

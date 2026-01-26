'use client';

import React, { useState, useEffect } from 'react';
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Settings2, Type, FileText, List, Upload, Edit, CheckSquare, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormFieldConfig } from '@/lib/db';

interface RoyalFormBuilderProps {
    fields: FormFieldConfig[];
    onChange: (fields: FormFieldConfig[]) => void;
}

const FIELD_TYPES = [
    { type: 'text', label: 'Short Text', icon: Type, desc: 'Names, Titles' },
    { type: 'textarea', label: 'Long Text', icon: FileText, desc: 'Descriptions, Bios' },
    { type: 'select', label: 'Dropdown', icon: List, desc: 'Options, Categories' },
    { type: 'file', label: 'File Upload', icon: Upload, desc: 'Images, PDFs' },
] as const;

const generateId = (type: string) => `${type}_${Math.random().toString(36).substr(2, 9)}`;

export function RoyalFormBuilder({ fields, onChange }: RoyalFormBuilderProps) {
    const [editingField, setEditingField] = useState<FormFieldConfig | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Reorder Handler
    const controls = useDragControls();

    const addField = (type: FormFieldConfig['type']) => {
        const newField: FormFieldConfig = {
            id: generateId(type),
            type,
            label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            required: false,
            options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
        };
        onChange([...fields, newField]);
        setEditingField(newField);
    };

    const updateField = (updated: FormFieldConfig) => {
        const newFields = fields.map(f => f.id === updated.id ? updated : f);
        onChange(newFields);
        setEditingField(updated);
    };

    const removeField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    const handleReorder = (newOrder: FormFieldConfig[]) => {
        onChange(newOrder);
    };

    return (
        <div className="space-y-4">
            {/* Toolbox */}
            <div className="flex gap-2 p-1 overflow-x-auto pb-2 scrollbar-none">
                {[
                    { type: 'text', icon: Type, label: 'Short Text' },
                    { type: 'textarea', icon: List, label: 'Long Text' },
                    { type: 'number', icon: Settings2, label: 'Number' },
                    { type: 'select', icon: GripVertical, label: 'Dropdown' },
                    { type: 'file', icon: Upload, label: 'File Upload' },
                    { type: 'checkbox', icon: CheckSquare, label: 'Declaration' },
                    { type: 'info', icon: Info, label: 'Instructions' },
                ].map((tool) => (
                    <Button
                        key={tool.type}
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-[#D4AF37]/50 gap-2 whitespace-nowrap"
                        type="button"
                        onClick={() => addField(tool.type as any)}
                    >
                        <tool.icon className="w-4 h-4 text-[#D4AF37]" />
                        {tool.label}
                    </Button>
                ))}
            </div>

            {/* Builder Canvas */}
            <div className="bg-black/20 p-4 rounded-xl border-2 border-dashed border-white/10 min-h-[200px] flex flex-col gap-2">
                {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[180px] text-slate-500 gap-2">
                        <Settings2 className="w-8 h-8 opacity-20" />
                        <p className="text-sm font-medium">Your form is empty</p>
                        <p className="text-xs">Select a tool above to start adding questions.</p>
                    </div>
                )}

                <Reorder.Group axis="y" values={fields} onReorder={handleReorder} className="space-y-2">
                    <AnimatePresence>
                        {fields.map((field) => (
                            <Reorder.Item
                                key={field.id}
                                value={field}
                                id={field.id}
                                className="bg-neutral-900/80 p-4 rounded-lg shadow-sm border border-white/5 group relative select-none hover:border-[#D4AF37]/30 transition-colors"
                                dragListener={false}
                                dragControls={controls}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="mt-1 cursor-grab active:cursor-grabbing text-slate-600 hover:text-white p-1"
                                        onPointerDown={(e) => controls.start(e)}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 space-y-1" onClick={() => setEditingField(field)}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white">{field.label}</span>
                                            {field.required && <Badge variant="destructive" className="text-[10px] h-4 px-1">Required</Badge>}
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-white/10 text-slate-400 capitalize">{field.type}</Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">
                                            {field.placeholder || 'No placeholder set'}
                                            {field.options && ` • ${field.options.length} options`}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setEditingField(field)}
                                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeField(field.id)}
                                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Reorder.Item>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>
            </div>

            {/* Config Sheet */}
            <Sheet open={!!editingField} onOpenChange={(open) => !open && setEditingField(null)}>
                <SheetContent className="bg-neutral-900 border-l border-white/10 text-white sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="text-white">Configure Field</SheetTitle>
                        <SheetDescription className="text-slate-400">
                            Edit the properties for "{editingField?.label}"
                        </SheetDescription>
                    </SheetHeader>

                    {editingField && (
                        <FieldConfigurator
                            field={editingField}
                            onUpdate={updateField}
                            onClose={() => setEditingField(null)}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function FieldConfigurator({ field, onUpdate, onClose }: {
    field: FormFieldConfig;
    onUpdate: (f: FormFieldConfig) => void;
    onClose: () => void;
}) {
    const [optionsStr, setOptionsStr] = useState(field.options?.join('\n') || '');

    // Sync options string when field changes externally (e.g. selection change)
    useEffect(() => {
        setOptionsStr(field.options?.join('\n') || '');
    }, [field.id]);

    const handleOptionsUpdate = (str: string) => {
        setOptionsStr(str);
        const opts = str.split('\n').map(s => s.trim()).filter(Boolean);
        onUpdate({ ...field, options: opts });
    };

    return (
        <div className="mt-8 space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-slate-300">{field.type === 'info' ? 'Title' : 'Question Label'}</Label>
                    <Input
                        value={field.label}
                        onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                        className="bg-white/5 border-white/10 text-white focus:border-[#D4AF37]/50"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Type</Label>
                        <Select
                            value={field.type}
                            onValueChange={(val: any) => onUpdate({ ...field, type: val })}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-white/10 text-white">
                                <SelectItem value="text">Short Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                                <SelectItem value="file">File Upload</SelectItem>
                                <SelectItem value="checkbox">Checkbox / Declaration</SelectItem>
                                <SelectItem value="info">Instruction Block</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {field.type !== 'info' && (
                        <div className="space-y-2">
                            <Label className="text-slate-300">Required?</Label>
                            <div
                                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${field.required
                                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 text-[#D4AF37]'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                    }`}
                                onClick={() => onUpdate({ ...field, required: !field.required })}
                            >
                                <Checkbox
                                    checked={field.required}
                                    onCheckedChange={(c) => onUpdate({ ...field, required: !!c })}
                                    className="border-white/20 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
                                />
                                <span className="text-sm font-medium">Yes, Mandatory</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300">
                        {field.type === 'info' ? 'Instruction Text (Body)' : field.type === 'checkbox' ? 'Declaration Text (same as label usually)' : 'Placeholder / Helper Text'}
                    </Label>
                    {field.type === 'info' ? (
                        <textarea
                            rows={4}
                            value={field.placeholder || ''}
                            onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 text-white font-sans text-sm focus:border-[#D4AF37]/50 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
                            placeholder="Enter the detailed instructions here..."
                        />
                    ) : (
                        <Input
                            value={field.placeholder || ''}
                            onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                            className="bg-white/5 border-white/10 text-white focus:border-[#D4AF37]/50"
                            placeholder="e.g. Enter your full name"
                        />
                    )}
                </div>

                {(field.type === 'select') && (
                    <div className="space-y-2">
                        <Label className="text-slate-300 flex justify-between">
                            <span>Options</span>
                            <span className="text-xs text-slate-500">One per line</span>
                        </Label>
                        <textarea
                            rows={5}
                            value={optionsStr}
                            onChange={(e) => handleOptionsUpdate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white font-mono text-sm focus:border-[#D4AF37]/50 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
                            placeholder={"Option 1\nOption 2\nOption 3"}
                        />
                    </div>
                )}
            </div>

            <div className="pt-8">
                <Button className="w-full bg-white text-black hover:bg-slate-200 font-bold" onClick={onClose}>
                    Done
                </Button>
            </div>
        </div>
    );
}

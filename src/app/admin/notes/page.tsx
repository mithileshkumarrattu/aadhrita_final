'use client';
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { getNotes, addNote, deleteNote } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, Link, Trash2, ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNotesPage() {
    const [notes, setNotes] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    // Grouping State: Expanded subjects
    const [expandedSubjects, setExpandedSubjects] = React.useState<string[]>([]);

    const [newNote, setNewNote] = React.useState({
        title: '',
        subject: '',
        gdriveUrl: '',
        category: 'Lecture Notes'
    });

    React.useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        try {
            const data = await getNotes();
            setNotes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!newNote.title || !newNote.gdriveUrl || !newNote.subject) {
            toast.error("Please fill all fields");
            return;
        }
        setLoading(true);
        try {
            await addNote({
                title: newNote.title,
                subject: newNote.subject,
                gdriveUrl: newNote.gdriveUrl,
                sender: 'admin',
                category: newNote.category
            });
            toast.success("Note Uploaded");
            setNewNote({ ...newNote, title: '', gdriveUrl: '' }); // Keep Subject/Category for ease
            loadNotes();
        } catch (e) {
            toast.error("Failed");
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (subj: string) => {
        setExpandedSubjects(prev =>
            prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
        );
    };

    // Group notes by Subject
    const groupedNotes = React.useMemo(() => {
        const groups: Record<string, any[]> = {};
        notes.forEach(note => {
            const s = note.subject || 'Uncategorized';
            if (!groups[s]) groups[s] = [];
            groups[s].push(note);
        });
        return groups;
    }, [notes]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black">Notes Repository</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Form */}
                <Card className="p-6 border-2 border-black shadow-neo-lg rounded-2xl h-fit">
                    <h2 className="text-xl font-bold mb-4">Upload New Material</h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} className="border-black" placeholder="e.g. Unit 1 - Introduction" />
                        </div>
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input value={newNote.subject} onChange={e => setNewNote({ ...newNote, subject: e.target.value })} className="border-black" placeholder="e.g. Data Structures" />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <select
                                className="w-full h-10 rounded-md border border-black px-3 text-sm"
                                value={newNote.category}
                                onChange={e => setNewNote({ ...newNote, category: e.target.value })}
                            >
                                <option value="Lecture Notes">Lecture Notes</option>
                                <option value="Question Papers">Question Papers</option>
                                <option value="Lab Manuals">Lab Manuals</option>
                                <option value="Textbooks">Textbooks</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Google Drive Link (Anyone with link)</Label>
                            <Input value={newNote.gdriveUrl} onChange={e => setNewNote({ ...newNote, gdriveUrl: e.target.value })} className="border-black" placeholder="https://drive.google.com/..." />
                        </div>
                        <Button onClick={handleUpload} className="w-full border-2 border-black shadow-neo">Upload Material</Button>
                    </div>
                </Card>

                {/* Subject List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Existing Notes</h2>
                    <div className="space-y-2">
                        {Object.entries(groupedNotes).map(([subject, subjectNotes]) => {
                            const isExpanded = expandedSubjects.includes(subject);
                            return (
                                <div key={subject} className="border-2 border-black rounded-xl overflow-hidden shadow-neo-sm bg-white">
                                    <button
                                        onClick={() => toggleSubject(subject)}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 font-bold">
                                            <Folder className="w-5 h-5" />
                                            {subject}
                                            <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
                                                {subjectNotes.length}
                                            </span>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="p-2 space-y-2 border-t-2 border-black bg-white">
                                            {subjectNotes.map((note) => (
                                                <div key={note.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between group hover:border-black transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                        <div>
                                                            <div className="font-bold text-sm">{note.title}</div>
                                                            <div className="text-[10px] uppercase font-bold text-slate-400">
                                                                {note.category}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a href={note.gdriveUrl} target="_blank" className="text-xs font-bold underline">View</a>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={async () => {
                                                                if (confirm("Delete this note?")) {
                                                                    await deleteNote(note.id);
                                                                    loadNotes();
                                                                    toast.success("Deleted");
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {Object.keys(groupedNotes).length === 0 && (
                            <div className="text-slate-500 text-center py-10 font-bold opacity-50">
                                No notes uploaded yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Search, ExternalLink, X, BookOpen, Download, Folder, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getNotes, addNote } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function NotesPage() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const [notes, setNotes] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [expandedSubjects, setExpandedSubjects] = React.useState<string[]>([]);

    // Viewer State
    const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
    const [isViewerOpen, setIsViewerOpen] = React.useState(false);

    // Upload State (Admin Only)
    const [isUploadOpen, setIsUploadOpen] = React.useState(false);
    const [newNote, setNewNote] = React.useState({
        title: '',
        subject: '',
        gdriveUrl: ''
    });

    React.useEffect(() => {
        const fetchNotes = async () => {
            try {
                const fetchedNotes = await getNotes();
                setNotes(fetchedNotes);
            } catch (e) {
                console.error("Failed to fetch notes", e);
            } finally {
                setLoading(false);
            }
        };
        fetchNotes();
    }, []);

    const handleViewNote = async (url: string) => {
        try {
            const res = await fetch('/api/get-google-drive-viewer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: url })
            });
            const data = await res.json();
            if (data.success) {
                setViewerUrl(data.viewerUrl);
                setIsViewerOpen(true);
            } else {
                alert("Failed to load generic preview: " + data.error);
                window.open(url, '_blank');
            }
        } catch (e) {
            console.error(e);
            window.open(url, '_blank');
        }
    };

    const handleUpload = async () => {
        if (!userProfile || !newNote.title || !newNote.gdriveUrl) return;
        try {
            await addNote({
                title: newNote.title,
                subject: newNote.subject || 'General',
                gdriveUrl: newNote.gdriveUrl,
                userId: userProfile.uid,
                category: 'Lecture Notes'
            });
            setIsUploadOpen(false);
            setNewNote({ title: '', subject: '', gdriveUrl: '' });
            const fetchedNotes = await getNotes();
            setNotes(fetchedNotes);
        } catch (error) {
            console.error("Upload failed", error);
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

    // Flat Filter for Search
    const filteredNotes = notes.filter(note => {
        return note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.subject.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-black px-4 py-3 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-slate-100 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="font-black text-xl tracking-tight">Study Materials</div>
            </header>

            <main className="container max-w-md mx-auto px-4 mt-6">

                {/* Search & Upload */}
                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search notes..."
                            className="pl-9 border-2 border-black shadow-neo-sm focus-visible:ring-0 rounded-xl"
                        />
                    </div>
                    {userProfile?.role === 'admin' && (
                        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" className="border-2 border-black shadow-neo hover:translate-y-0.5 hover:shadow-none transition-all rounded-xl">
                                    <BookOpen className="w-5 h-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="border-2 border-black shadow-neo-lg rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="font-black text-xl">Upload Material</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Title</Label>
                                        <Input
                                            value={newNote.title}
                                            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                            className="border-2 border-black shadow-neo-sm"
                                            placeholder="e.g. Unit 1 Notes"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">Subject</Label>
                                        <Input
                                            value={newNote.subject}
                                            onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })}
                                            className="border-2 border-black shadow-neo-sm"
                                            placeholder="e.g. Mathematics"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">Google Drive Link</Label>
                                        <Input
                                            value={newNote.gdriveUrl}
                                            onChange={(e) => setNewNote({ ...newNote, gdriveUrl: e.target.value })}
                                            className="border-2 border-black shadow-neo-sm"
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                    <Button onClick={handleUpload} className="w-full mt-2 border-2 border-black shadow-neo active:shadow-none">Upload</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Notes Content */}
                {searchTerm ? (
                    // 1. SEARCH MODE: Flat List
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search Results</div>
                        {filteredNotes.length === 0 ? (
                            <div className="text-center py-10 opacity-50 font-bold">No matching notes found.</div>
                        ) : (
                            filteredNotes.map((note) => (
                                <Card key={note.id} className="p-4 border-2 border-black shadow-neo bg-white rounded-xl flex items-center justify-between group hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-yellow-100 border-2 border-black flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-yellow-700" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm truncate pr-2">{note.title}</h4>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground flex gap-2">
                                                {note.subject}
                                                {note.category && <span className="text-black bg-slate-200 px-1 rounded">{note.category}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleViewNote(note.gdriveUrl)}
                                        className="rounded-full hover:bg-slate-100 h-8 w-8 p-0 border border-black"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </Card>
                            ))
                        )}
                    </div>
                ) : (
                    // 2. BROWSE MODE: Subject Accordions
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-10 opacity-50 font-bold">Loading resources...</div>
                        ) : Object.keys(groupedNotes).length === 0 ? (
                            <div className="text-center py-10 opacity-50 font-bold">No notes available.</div>
                        ) : (
                            Object.entries(groupedNotes).map(([subject, subjectNotes]) => {
                                const isExpanded = expandedSubjects.includes(subject);
                                return (
                                    <div key={subject} className="border-2 border-black rounded-xl overflow-hidden shadow-neo bg-white transition-all">
                                        <button
                                            onClick={() => toggleSubject(subject)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 font-bold">
                                                <Folder className="w-5 h-5 text-black" />
                                                <span>{subject}</span>
                                                <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
                                                    {subjectNotes.length}
                                                </span>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="p-2 space-y-2 border-t-2 border-black bg-white">
                                                {subjectNotes.map((note) => (
                                                    <div key={note.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between group hover:border-black transition-colors cursor-pointer" onClick={() => handleViewNote(note.gdriveUrl)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-yellow-50 border border-slate-300 flex items-center justify-center shrink-0">
                                                                <FileText className="w-4 h-4 text-yellow-600" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm">{note.title}</div>
                                                                <div className="text-[10px] uppercase font-bold text-slate-400">
                                                                    {note.category || 'Note'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </main>

            {/* PDF Viewer Dialog/Overlay */}
            {isViewerOpen && viewerUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl h-[95vh] rounded-2xl border-2 border-black shadow-neo-lg flex flex-col overflow-hidden relative">
                        <div className="p-3 border-b-2 border-black flex justify-between items-center bg-slate-50">
                            <span className="font-bold text-sm">Document Preview</span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-full border-2 border-black"
                                    onClick={() => window.open(viewerUrl.replace('/preview', '/view'), '_blank')}
                                >
                                    <Download className="w-3 h-3 mr-1" /> Open Ext
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 w-8 p-0 rounded-full border-2 border-black"
                                    onClick={() => setIsViewerOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <iframe
                            src={viewerUrl}
                            className="flex-1 w-full bg-slate-100"
                            title="Notes Viewer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

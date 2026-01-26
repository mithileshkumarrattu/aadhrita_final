'use client';
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { sendNotification, getNotifications, getClubs, Club } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Bell, Image as ImageIcon, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminFeedPage() {
    const [title, setTitle] = React.useState('');
    const [body, setBody] = React.useState('');
    const [imageUrl, setImageUrl] = React.useState('');
    const [type, setType] = React.useState<'global' | 'club'>('global');
    const [targetClubId, setTargetClubId] = React.useState('');
    const [clubs, setClubs] = React.useState<Club[]>([]);

    const [loading, setLoading] = React.useState(false);
    const [preview, setPreview] = React.useState<any[]>([]);

    React.useEffect(() => {
        const load = async () => {
            const data = await getNotifications();
            const clubsData = await getClubs();
            setPreview(data);
            // @ts-ignore
            setClubs(clubsData as any[]);
        }
        load();
    }, [loading]);

    const handleSend = async () => {
        if (!title || !body) return;
        if (type === 'club' && !targetClubId) {
            toast.error("Please select a club");
            return;
        }

        setLoading(true);
        try {
            await sendNotification({
                title,
                body,
                sender: 'Admin',
                type,
                targetClubId: type === 'club' ? targetClubId : undefined,
                imageUrl
            });
            toast.success("Notification Sent!");
            setTitle('');
            setBody('');
            setImageUrl('');
            setType('global');
            setTargetClubId('');
        } catch (e) {
            console.error(e);
            toast.error("Failed to send");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8">
            <h1 className="text-3xl font-black flex items-center gap-3">
                <Bell className="w-8 h-8" /> Notification Center
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Form */}
                <Card className="p-6 border-2 border-black shadow-neo-lg rounded-2xl bg-white">
                    <h2 className="text-xl font-bold mb-6">Compose Announcement</h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold">Target Audience</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={type === 'global'}
                                        onChange={() => setType('global')}
                                        className="w-4 h-4 accent-black"
                                    />
                                    <span className="font-bold text-sm">Global (All Students)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={type === 'club'}
                                        onChange={() => setType('club')}
                                        className="w-4 h-4 accent-black"
                                    />
                                    <span className="font-bold text-sm">Specific Club</span>
                                </label>
                            </div>
                        </div>

                        {type === 'club' && (
                            <div className="space-y-2">
                                <Label className="font-bold">Select Club</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-md border-2 border-black bg-white text-sm font-medium shadow-neo-sm focus:outline-none"
                                    value={targetClubId}
                                    onChange={(e) => setTargetClubId(e.target.value)}
                                >
                                    <option value="">Select a club...</option>
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-bold">Title</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="border-2 border-black shadow-neo-sm focus-visible:ring-0"
                                placeholder={type === 'global' ? "e.g. Holiday Notice" : "e.g. Club Meeting"}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold">Body</Label>
                            <Textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                className="border-2 border-black shadow-neo-sm focus-visible:ring-0 min-h-[100px]"
                                placeholder="Details..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image URL (Optional)</Label>
                            <Input
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                className="border-2 border-black shadow-neo-sm focus-visible:ring-0"
                                placeholder="https://..."
                            />
                        </div>

                        <Button onClick={handleSend} disabled={loading} className="w-full mt-4 bg-black text-white border-2 border-black shadow-neo hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2">
                            <Send className="w-4 h-4" /> {type === 'global' ? 'Send to All' : 'Send to Club'}
                        </Button>
                    </div>
                </Card>

                {/* Preview */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Recent History</h2>
                    <div className="space-y-4">
                        {preview.map((notif: any) => (
                            <Card key={notif.id} className="p-4 border-2 border-black shadow-neo bg-white rounded-xl relative group">
                                <Button
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 bg-red-100 text-red-600 hover:bg-red-200 border border-red-200 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                    onClick={async () => {
                                        if (confirm("Delete this notification?")) {
                                            await import('@/lib/db').then(m => m.deleteNotification(notif.id));
                                            setLoading(!loading); // Trigger reload
                                            toast.success("Deleted");
                                        }
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                {notif.imageUrl && (
                                    <div className="mb-3 rounded-lg overflow-hidden border border-black h-32 w-full">
                                        <img src={notif.imageUrl} alt="Notif" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-1 pr-6">
                                    <h3 className="font-black text-lg">{notif.title}</h3>
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border border-black uppercase whitespace-nowrap",
                                        notif.type === 'global' ? "bg-black text-white" : "bg-cyan-100 text-cyan-900"
                                    )}>
                                        {notif.type}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notif.body}</p>
                                <div className="mt-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                    {new Date(notif.createdAt?.seconds * 1000).toLocaleDateString()}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper for cn in this file if needed, or import
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronLeft, Calendar } from 'lucide-react';
import { getNotifications } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data = await getNotifications();
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifs();
    }, []);

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="p-4 flex items-center border-b sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                </h1>
            </div>

            <div className="container max-w-md mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-muted-foreground animate-pulse">
                        Loading updates...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No Notifications</h3>
                        <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <Card key={notif.id} className="border bg-card shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                                        Announcement
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground flex items-center shrink-0">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {notif.createdAt?.seconds
                                            ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString()
                                            : 'Just now'}
                                    </span>
                                </div>
                                <CardTitle className="text-base font-semibold mt-2 leading-tight">
                                    {notif.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {notif.body}
                                </p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

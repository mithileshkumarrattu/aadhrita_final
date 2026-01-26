'use client';

import * as React from 'react';
import { getNotifications, getUserClubIds } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Megaphone, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Notification {
    id: string;
    title: string;
    message?: string;
    body?: string;
    imageUrl?: string;
    createdAt: any;
    type: 'global' | 'class' | 'club';
}

export default function NotificationsCarousel() {
    const { userProfile } = useAuth();
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchNotifications = async () => {
            if (!userProfile) return;
            try {
                // 1. Get clubs user is part of
                const userClubs = await getUserClubIds(userProfile.uid);

                // 2. Fetch notifications filtered by Global + My Clubs
                // Note: The db.ts getNotifications handles the logic of merging them.
                const data = await getNotifications(userProfile.uid);

                setNotifications(data as Notification[]);
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [userProfile]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length);
    };

    if (loading) return <div className="h-48 rounded-2xl bg-slate-100 animate-pulse border-2 border-black" />;
    if (notifications.length === 0) return (
        <Card className="p-6 border-2 border-dashed border-black bg-yellow-50 rounded-2xl text-center">
            <p className="text-sm font-bold text-slate-500">No new announcements</p>
        </Card>
    );

    const current = notifications[currentIndex];

    // Dynamic color based on type
    const cardColor = current.type === 'global' ? 'bg-white' : 'bg-cyan-50';
    const badgeVariant = current.type === 'global' ? 'default' : 'secondary';

    return (
        <div className="relative w-full mb-6 group">
            <Card className={cn(
                "border-2 border-black shadow-neo rounded-[1.5rem] overflow-hidden min-h-[200px] flex flex-col relative p-0 transition-all duration-300",
                cardColor
            )}>
                {/* Header Strip */}
                <div className="bg-black text-white px-6 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant={badgeVariant} className={cn(
                            "uppercase tracking-wider text-[10px] border border-white font-black",
                            current.type === 'global' ? "bg-red-500 text-white" : "bg-cyan-400 text-black"
                        )}>
                            {current.type}
                        </Badge>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                            {new Date(current.createdAt?.seconds * 1000).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-2xl font-black mb-3 text-foreground leading-none tracking-tight">
                        {current.title}
                    </h3>

                    {current.imageUrl && (
                        <div className="w-full h-40 mb-4 rounded-xl overflow-hidden border-2 border-black relative shrink-0 shadow-sm">
                            <img
                                src={current.imageUrl}
                                alt={current.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <p className="text-sm text-slate-700 font-medium leading-relaxed line-clamp-3 mb-4">
                        {current.message || current.body}
                    </p>

                    {/* Dots indicator */}
                    <div className="flex gap-2 mt-auto justify-center">
                        {notifications.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300 border border-black",
                                    idx === currentIndex ? "w-6 bg-black" : "w-2 bg-slate-200"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </Card>

            {notifications.length > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-[-10px] top-1/2 -translate-y-1/2 bg-white border-2 border-black text-black hover:bg-yellow-200 rounded-full h-10 w-10 transition-all shadow-neo active:shadow-none active:translate-y-[-40%]"
                        onClick={handlePrev}
                    >
                        <ChevronLeft className="h-5 w-5 stroke-[3px]" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-[-10px] top-1/2 -translate-y-1/2 bg-white border-2 border-black text-black hover:bg-yellow-200 rounded-full h-10 w-10 transition-all shadow-neo active:shadow-none active:translate-y-[-40%]"
                        onClick={handleNext}
                    >
                        <ChevronRight className="h-5 w-5 stroke-[3px]" />
                    </Button>
                </>
            )}
        </div>
    );
}

import { useCallback, useEffect, useState } from 'react';
import { db, COLLECTIONS, Event } from '@/lib/db';
import { collection, query, where, collectionGroup, getDocs } from 'firebase/firestore';

export interface EventSummaryRow {
    id: string;
    eventName: string;
    type: 'Team' | 'Solo' | 'Pass';
    totalTeams: number | null;
    mvgrParticipants: number;
    otherParticipants: number;
    totalParticipants: number;
    revenue?: number;
}

const isMvgrStudent = (collegeName: any, email?: string) => {
    const colStr = String(collegeName || '').toUpperCase();
    if (
        colStr.includes('MVGR') ||
        colStr.includes('MAHARAJ') ||
        colStr.includes('VIJAYARAM') ||
        colStr.includes('GAJAPATHI')
    ) {
        return true;
    }
    if (email && String(email).toLowerCase().endsWith('@mvgrce.edu.in')) {
        return true;
    }
    return false;
};

const getPplKey = (user: any) => {
    if (!user) return null;
    const regNo = String(user.regNo || user.registrationNumber || '').toUpperCase().trim();
    if (regNo && regNo.length > 3) return regNo;
    const email = String(user.email || '').toLowerCase().trim();
    if (email) return email;
    return user.uid || user.id || null;
};

export function useLiveOverview(events: Event[]) {
    const [summaryData, setSummaryData] = useState<EventSummaryRow[]>([]);
    const [usersData, setUsersData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Single async function that fetches all collections in parallel and computes the summary.
    // Called on mount and whenever the coordinator clicks "Refresh".
    const [grossRevenue, setGrossRevenue] = useState<number>(0);

    const loadData = useCallback(async () => {
        if (!events || events.length === 0) return;
        setLoading(true);

        try {
            const resp = await fetch('/api/faculty/stats/summary');
            const data = await resp.json();

            if (data.success) {
                setSummaryData(data.summary);
                setUsersData(data.users || []);
                setGrossRevenue(data.grossRevenue || 0);
            } else {
                console.error('[Faculty Summary] API Error:', data.error);
            }
        } catch (err) {
            console.error('[Faculty Summary] loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [events]);

    // Load once on mount (and whenever events list changes)
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Return refresh so the page can wire it up to a "Refresh" button
    return { summaryData, usersData, grossRevenue, overviewLoading: loading, refreshSummary: loadData };
}

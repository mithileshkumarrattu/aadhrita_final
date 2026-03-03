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

export function useLiveOverview(events: Event[]) {
    const [summaryData, setSummaryData] = useState<EventSummaryRow[]>([]);
    const [usersData, setUsersData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Single async function that fetches all collections in parallel and computes the summary.
    // Called on mount and whenever the coordinator clicks "Refresh".
    const loadData = useCallback(async () => {
        if (!events || events.length === 0) return;
        setLoading(true);

        try {
            const usersQ = query(collection(db, COLLECTIONS.USERS), where('hasEntryPass', '==', true));
            const txnsQ = query(collection(db, 'transactions'), where('status', '==', 'SUCCESS'));
            const hackathonQ = query(collection(db, COLLECTIONS.HACKATHON));
            const legacyHackathonQ = query(collection(db, 'reg_hackathon'));

            // Start all 4 queries at the same time — no sequential waiting
            const [usersSnap, txnsSnap, hackathonSnap, legacySnap] = await Promise.all([
                getDocs(usersQ),
                getDocs(txnsQ),
                getDocs(hackathonQ),
                getDocs(legacyHackathonQ),
            ]);

            // Registrations — try with index, fall back to client-side filter if index missing
            let regsDocs: any[] = [];
            try {
                const regsQ = query(collectionGroup(db, 'registrations'), where('paymentStatus', 'in', ['success', 'paid', 'free', 'completed', 'approved']));
                const regsSnap = await getDocs(regsQ);
                regsDocs = regsSnap.docs;
            } catch (e: any) {
                if (e.message?.includes('index')) {
                    console.warn('[Summary] Index missing — falling back to client-side filter');
                    const fallbackSnap = await getDocs(query(collectionGroup(db, 'registrations')));
                    const validStatuses = ['success', 'paid', 'free', 'completed', 'approved'];
                    regsDocs = fallbackSnap.docs.filter(doc => validStatuses.includes(doc.data().paymentStatus));
                } else {
                    throw e;
                }
            }

            // Build lookup maps
            const txnsMap = new Map<string, any>();
            txnsSnap.docs.forEach(doc => {
                const txn = doc.data();
                if (txn.userId) txnsMap.set(txn.userId, txn);
            });

            const currentUsersDocs = usersSnap.docs;

            // Missing users cache for registrations that lack userSnapshot
            const missingUsersCache: Record<string, any> = {};
            const userIdsToFetch = new Set<string>();
            regsDocs.forEach(docSnap => {
                const reg = docSnap.data();
                if (!reg.userSnapshot && reg.userId && !missingUsersCache[reg.userId]) {
                    userIdsToFetch.add(reg.userId);
                }
            });
            if (userIdsToFetch.size > 0) {
                const idsArray = Array.from(userIdsToFetch);
                for (let i = 0; i < idsArray.length; i += 10) {
                    const chunk = idsArray.slice(i, i + 10);
                    const q = query(collection(db, COLLECTIONS.USERS), where('uid', 'in', chunk));
                    try {
                        const snaps = await getDocs(q);
                        snaps.forEach(d => {
                            missingUsersCache[d.id] = d.data();
                            missingUsersCache[d.data().uid] = d.data();
                        });
                    } catch (e) { console.error('Could not fetch missing users', e); }
                }
            }

            // --- Compute Summary ---
            const newSummary: EventSummaryRow[] = [];

            // 1. Entry Passes (filtered by FreeFire check)
            let mvgrCount = 0;
            let otherCount = 0;
            currentUsersDocs.forEach(doc => {
                const u = doc.data();
                const txn = txnsMap.get(u.userId || doc.id);
                if (txn?.orderId?.startsWith('FF-')) return; // exclude FreeFire
                if (isMvgrStudent(u.collegeName, u.email)) mvgrCount++;
                else otherCount++;
            });
            newSummary.push({
                id: 'ENTRY_PASS',
                eventName: 'General Entry Pass',
                type: 'Pass',
                totalTeams: null,
                mvgrParticipants: mvgrCount,
                otherParticipants: otherCount,
                totalParticipants: mvgrCount + otherCount
            });

            // 2. Events
            const eventStats: Record<string, { teams: Set<string>; mvgr: Set<string>; other: Set<string> }> = {};
            events.forEach(e => {
                eventStats[e.id!] = { teams: new Set(), mvgr: new Set(), other: new Set() };
            });

            regsDocs.forEach(docSnap => {
                const reg = docSnap.data();
                const eId = reg.eventId;
                if (!eId || !eventStats[eId]) return;

                let u = reg.userSnapshot || currentUsersDocs.find(doc => doc.id === reg.userId)?.data();
                if (!u && reg.userId) u = missingUsersCache[reg.userId];

                if (reg.teamId) {
                    eventStats[eId].teams.add(reg.teamId);
                } else if (reg.responses?.teamName) {
                    eventStats[eId].teams.add(reg.responses.teamName);
                }

                const userKey = reg.userId || docSnap.id;
                const fallbackCol = u?.collegeName || reg.responses?.collegeName || reg.responses?.college || '';
                const isMvgr = isMvgrStudent(fallbackCol, u?.email || reg.responses?.email || reg.email);
                if (isMvgr) eventStats[eId].mvgr.add(userKey);
                else eventStats[eId].other.add(userKey);

                // Track team members
                if (reg.teamMembers && Array.isArray(reg.teamMembers)) {
                    reg.teamMembers.forEach((member: any) => {
                        const mCol = member.collegeName || fallbackCol;
                        const memberIsMvgr = isMvgrStudent(mCol, member.email);
                        const uniqueKey = member.regNo || `${member.name}-${member.phone}`;
                        if (memberIsMvgr) eventStats[eId].mvgr.add(uniqueKey);
                        else eventStats[eId].other.add(uniqueKey);
                    });
                }
            });

            events.forEach(e => {
                const stats = eventStats[e.id!];
                const isTeam = (e.maxTeamSize || 1) > 1;
                newSummary.push({
                    id: e.id!,
                    eventName: e.title,
                    type: isTeam ? 'Team' : 'Solo',
                    totalTeams: isTeam ? stats.teams.size : null,
                    mvgrParticipants: stats.mvgr.size,
                    otherParticipants: stats.other.size,
                    totalParticipants: stats.mvgr.size + stats.other.size
                });
            });

            // 3. Hackathon
            let hackathonMvgr = 0;
            let hackathonOther = 0;
            let hackathonPaidTeamsCount = 0;

            const processHackathonDoc = (team: any) => {
                if (team.paymentStatus !== 'success' && team.paymentStatus !== 'paid') return;
                hackathonPaidTeamsCount++;
                if (team.leader) {
                    const fallbackCol = team.collegeName || '';
                    if (isMvgrStudent(team.leader.collegeName || fallbackCol, team.leader.email)) hackathonMvgr++;
                    else hackathonOther++;
                }
                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach((m: any) => {
                        const fallbackCol = team.collegeName || '';
                        const memberCollegeInfo = m.collegeName || (typeof m === 'string' ? m : fallbackCol);
                        if (isMvgrStudent(memberCollegeInfo, m.email)) hackathonMvgr++;
                        else hackathonOther++;
                    });
                }
            };

            hackathonSnap.docs.forEach(docSnap => processHackathonDoc(docSnap.data()));
            legacySnap.docs.forEach(docSnap => processHackathonDoc(docSnap.data()));

            newSummary.push({
                id: 'HACKATHON',
                eventName: 'Hackathon 2026',
                type: 'Team',
                totalTeams: hackathonPaidTeamsCount,
                mvgrParticipants: hackathonMvgr,
                otherParticipants: hackathonOther,
                totalParticipants: hackathonMvgr + hackathonOther
            });

            setSummaryData(newSummary);
            setUsersData(currentUsersDocs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    return { summaryData, usersData, overviewLoading: loading, refreshSummary: loadData };
}

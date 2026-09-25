import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const eventId = 'bridge-craft-challenge';

        // Find the teams
        const teamsQuery = await db.collection('teams').where('eventId', '==', eventId).get();
        const teams = teamsQuery.docs.map(d => ({ id: d.id, ...d.data() }));

        // Find the registrations
        const regsQuery = await db.collection('events').doc(eventId).collection('registrations').get();
        const regs = regsQuery.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        // Group by team
        const teamMap: any = {};
        for (const t of teams) {
            teamMap[t.id] = { team: t, regs: [] };
        }

        for (const r of regs) {
            const tId = (r as any).teamId;
            if (tId && teamMap[tId]) {
                teamMap[tId].regs.push(r);
            }
        }

        return NextResponse.json({
            event: eventId,
            teamsWithRegs: Object.values(teamMap).filter((t: any) => t.regs.length > 0 || (t.team.teamName && t.team.teamName.includes('BRIDGE')))
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const teamsQuery = await db.collection('teams').where('teamName', '==', 'Lady titans').get();
        const teams = teamsQuery.docs.map(d => ({ id: d.id, ...d.data() }));

        const teamsQuery2 = await db.collection('teams').where('teamName', '==', 'Lady Titans').get();
        const teams2 = teamsQuery2.docs.map(d => ({ id: d.id, ...d.data() }));

        // Now lookup their registrations
        const eventId = 'bridge-craft-challenge';
        const regsQuery = await db.collection('events').doc(eventId).collection('registrations').get();
        const regs = regsQuery.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) =>
            (r.teamName && r.teamName.toLowerCase().includes('lady titan')) ||
            (r.responses?.teamName && r.responses.teamName.toLowerCase().includes('lady titan'))
        );

        return NextResponse.json({
            teams: [...teams, ...teams2],
            regs
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

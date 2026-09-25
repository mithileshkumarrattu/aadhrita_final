import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const teamIdStr = 'CRAFT_TITANS_2920';

        // Find the team
        const teamsQuery = await db.collection('teams').where('teamId', '==', teamIdStr).get();
        const teams = teamsQuery.docs.map(d => ({ id: d.id, ...d.data() } as any));

        let registrations: any[] = [];
        let eventConfig = null;
        if (teams.length > 0) {
            const eventId = teams[0].eventId;

            // Get event config
            const eventSnap = await db.collection('events').doc(eventId).get();
            eventConfig = eventSnap.exists ? eventSnap.data() : null;

            // Find the registrations
            const regsQuery = await db.collection('events').doc(eventId).collection('registrations').where('teamId', '==', teamIdStr).get();
            registrations = regsQuery.docs.map(d => ({
                id: d.id,
                path: d.ref.path,
                ...d.data()
            }));
        }

        return NextResponse.json({
            eventConfig,
            teams,
            registrations
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

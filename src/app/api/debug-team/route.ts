import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid') || '34PcgkBhkHaEjKImfcY8lceJ4XO2';

    const user = await adminDb.collection('users').doc(uid).get();

    const hack = await adminDb.collection('hackathon_teams').where('leader.uid', '==', uid).get();
    const teams = hack.docs.map(d => ({ id: d.id, data: d.data() }));

    const reg = await adminDb.collection('registrations').doc(uid).get();

    return NextResponse.json({
        user: user.exists ? user.data() : null,
        teams,
        reg: reg.exists ? reg.data() : null
    });
}

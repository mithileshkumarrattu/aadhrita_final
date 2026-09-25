import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const teamsQuery = await db.collection('teams').get();
        const teams = teamsQuery.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const toRevert: any[] = [];

        for (const team of teams) {
            const eventId = team.eventId;
            const teamId = team.teamId;
            if (!eventId || !teamId) continue;

            const regsQuery = await db.collection('events').doc(eventId).collection('registrations')
                .where('teamId', '==', teamId).get();

            const regs = regsQuery.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() } as any));

            const userGroups: Record<string, any[]> = {};
            for (const r of regs) {
                if (!userGroups[r.userId]) userGroups[r.userId] = [];
                userGroups[r.userId].push(r);
            }

            for (const [uid, userRegs] of Object.entries(userGroups)) {
                const successRegs = userRegs.filter(r => r.paymentStatus === 'success');

                if (successRegs.length > 1) {
                    successRegs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    // Revert all except the newest valid one
                    for (let i = 1; i < successRegs.length; i++) {
                        toRevert.push({ id: successRegs[i].id, reason: 'Duplicate abandoned success', ref: successRegs[i].ref, uid });
                    }
                    // Check if the newest one is also a fake one we mutated
                    const r = successRegs[0];
                    if (r.amount === undefined && !r.orderId) {
                        if (uid === 'rN8zL5MB3cSpFi4YPLxQGJA18uJ3' && eventId === 'bridge-craft-challenge') { continue; }
                        toRevert.push({ id: r.id, reason: 'Newest fake success', ref: r.ref, uid });
                    }
                } else if (successRegs.length === 1) {
                    const r = successRegs[0];
                    if (r.amount === undefined && !r.orderId) {
                        if (uid === 'rN8zL5MB3cSpFi4YPLxQGJA18uJ3' && eventId === 'bridge-craft-challenge') {
                            continue;
                        }
                        toRevert.push({ id: r.id, reason: 'Fake success without amount/orderId', ref: r.ref, uid });
                    }
                }
            }
        }

        // Actually revert them back to pending
        for (const r of toRevert) {
            await r.ref.update({ paymentStatus: 'pending' });
        }

        return NextResponse.json({
            success: true,
            revertedCount: toRevert.length,
            reverted: toRevert.map(r => ({ id: r.id, reason: r.reason, uid: r.uid }))
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

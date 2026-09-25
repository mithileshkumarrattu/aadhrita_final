import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const authResult = await verifyStaffRequest(request);
    if (!authResult.ok) return authResult.response;

    const { uid, scanType, location = 'Main Gate', scannerId } = await request.json();

    if (!uid || !scanType) {
        return NextResponse.json({ error: 'Missing uid or scanType' }, { status: 400 });
    }

    try {
        const batch = adminDb.batch();

        // 1. Log the access
        const logRef = adminDb.collection('access_logs').doc();
        batch.set(logRef, {
            userId: uid,
            scanType,
            location,
            scannerId: scannerId || authResult.email,
            timestamp: new Date(),
        });

        // 2. If it's a HANDOVER, update the user flag
        if (scanType === 'HANDOVER') {
            const userRef = adminDb.collection('users').doc(uid);
            batch.update(userRef, {
                kitHandoverLoggedBySecurity: true,
                kitHandoverAt: new Date(),
                kitHandoverBy: authResult.email
            });
        }

        await batch.commit();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Security Action API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

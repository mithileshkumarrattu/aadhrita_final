import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const authResult = await verifyAdminRequest(request);
    if (!authResult.ok) return authResult.response;

    try {
        const usersSnap = await adminDb.collection('users').get();
        const total = usersSnap.size;
        let count = 0;

        // Use batches of 500
        let batch = adminDb.batch();
        let batchCount = 0;

        for (const userDoc of usersSnap.docs) {
            batch.update(userDoc.ref, {
                kitHandoverLoggedBySecurity: false
            });
            count++;
            batchCount++;

            if (batchCount === 500) {
                await batch.commit();
                batch = adminDb.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, processed: count, total });

    } catch (error: any) {
        console.error('[Migration API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

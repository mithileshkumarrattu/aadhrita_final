import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    const userId = '32Lhz4qdStcFbrmmiRZSl91uGEF2';
    const eventId = 'tech-quiz';
    const results: any = {};

    try {
        // 1. Fix User Profile
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        
        if (userSnap.exists) {
            await userRef.update({ hasEntryPass: true });
            results.userUpdate = "Successfully set hasEntryPass: true";
        } else {
            results.userUpdate = "User document not found";
        }

        // 2. Fix Event Registration
        const regSnap = await adminDb.collection('events')
            .doc(eventId)
            .collection('registrations')
            .where('userId', '==', userId)
            .get();

        if (!regSnap.empty) {
            const regDoc = regSnap.docs[0];
            await regDoc.ref.update({ paymentStatus: 'paid' });
            results.regUpdate = `Successfully set paymentStatus: paid for reg ID ${regDoc.id}`;
        } else {
            results.regUpdate = "No registration found for this event. Checking general registrations...";
            
            // Check general registrations collection as fallback
            const genRegSnap = await adminDb.collection('registrations')
                .where('userId', '==', userId)
                .where('eventId', '==', eventId)
                .get();
                
            if (!genRegSnap.empty) {
                const genDoc = genRegSnap.docs[0];
                await genDoc.ref.update({ paymentStatus: 'paid' });
                results.genRegUpdate = `Successfully set paymentStatus: paid for general reg ID ${genDoc.id}`;
            } else {
                results.genRegUpdate = "No registration found in general collection either.";
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

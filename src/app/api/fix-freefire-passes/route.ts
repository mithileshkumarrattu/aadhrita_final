import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Only allow execution with a secret key in production for safety
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find users who have BOTH a Freefire pass AND an Entry pass
        const usersSnap = await adminDb.collection("users")
            .where('hasFreefirePass', '==', true)
            .where('hasEntryPass', '==', true)
            .get();

        let fixedCount = 0;
        const results = [];

        // Also check hackathon just in case
        const hackathonSnap = await adminDb.collection("users")
            .where('hasHackathonPass', '==', true)
            .where('hasEntryPass', '==', true)
            .get();

        const allDocs = [...usersSnap.docs, ...hackathonSnap.docs];
        // Deduplicate in case a user has both
        const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());

        for (const userDoc of uniqueDocs) {
            const userData = userDoc.data();
            const registeredEvents = userData.registeredEventIds || [];

            // A user SHOULD have an entry pass ONLY IF they registered for standard events
            // AND the array actually has items other than HACKATHON.
            const standardEvents = registeredEvents.filter((id: string) => id !== 'HACKATHON');

            // If they have NO standard events, they shouldn't have `hasEntryPass: true`
            if (standardEvents.length === 0) {
                // Stripe away the fake entry pass
                await userDoc.ref.update({
                    hasEntryPass: false
                });

                // Also update the global registrations cache if it exists
                try {
                    const regRef = adminDb.collection("registrations").doc(userDoc.id);
                    const regSnap = await regRef.get();
                    if (regSnap.exists) {
                        await regRef.update({ hasEntryPass: false });
                    }
                } catch (e) {
                    // ignore
                }

                fixedCount++;
                results.push({ userId: userDoc.id, name: userData.fullName || userData.name });
            }
        }

        return NextResponse.json({ success: true, fixedCount, results });
    } catch (e: any) {
        console.error("Migration Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

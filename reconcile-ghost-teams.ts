import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
    const googleKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: googleKey,
        }),
    });
} else {
    admin.app();
}

const db = admin.firestore();

async function runReconciliation() {
    console.log("Starting Global Ghost Team Reconciliation...");

    // 1. Fetch all successfully paid registrations that have a teamId
    // Standard events only for now (not Hackathon or Freefire initially to be safe, since they have their own maxSizes etc.)
    // But actually, we can do any event because standard teams don't strictly crash if maxSize is loosely correct.
    const regQuery = await db.collectionGroup('registrations').where('paymentStatus', 'in', ['success', 'free', 'completed']).get();

    const orphansByTeamId: Record<string, { eventId: string, members: any[] }> = {};
    const existingTeamsCache: Record<string, boolean> = {};

    let checkedRegistrations = 0;

    // Pre-fetch all teams to memoria
    console.log("Pre-fetching all teams...");
    const allTeamsSnap = await db.collection('teams').get();
    for (const d of allTeamsSnap.docs) {
        existingTeamsCache[d.id] = true;
    }
    console.log(`Loaded ${allTeamsSnap.docs.length} teams into cache.`);

    for (const doc of regQuery.docs) {
        checkedRegistrations++;
        const data = doc.data();
        if (!data.teamId || data.eventId === 'hackathon' || data.eventId === 'freefire') continue;

        // Verify if team exists
        const exists = !!existingTeamsCache[data.teamId];

        if (!exists) {
            if (!orphansByTeamId[data.teamId]) {
                orphansByTeamId[data.teamId] = { eventId: data.eventId, members: [] };
            }
            orphansByTeamId[data.teamId].members.push({
                docRef: doc.ref,
                userId: data.userId,
                role: data.role,
                teamName: data.teamName || data.responses?.teamName || data.teamId,
            });
        }
    }

    console.log(`Scan complete. Checked ${checkedRegistrations} successful registrations.`);
    const orphanedTeamIds = Object.keys(orphansByTeamId);
    console.log(`Found ${orphanedTeamIds.length} missing team documents that need to be rebuilt.`);

    // 2. Rebuild each orphaned team
    let rebuiltCount = 0;
    for (const teamId of orphanedTeamIds) {
        const { eventId, members } = orphansByTeamId[teamId];

        let leaderData = members.find(m => m.role === 'Leader');
        if (!leaderData && members.length > 0) {
            // Arbitrarily pick a new leader if the actual creator abandoned their cart
            leaderData = members[0];
            console.log(`Team ${teamId} has no assigned Leader in its registrations. Electing ${leaderData.userId} as Leader.`);
        }

        if (!leaderData) continue;

        // Fetch User Docs to get Names/RegNos
        const memberProfiles = [];
        for (const m of members) {
            const uDoc = await db.collection('users').doc(m.userId).get();
            const uData = uDoc.data() || {};
            memberProfiles.push({
                userId: m.userId,
                name: uData.fullName || uData.displayName || 'Student',
                regNo: uData.regNo || uData.registrationNumber || 'GOOGLE_USER',
                role: m.role
            });
        }

        const teamName = leaderData.teamName || teamId.split('_')[0];
        const memberIds = memberProfiles.map(m => m.userId);

        // Calculate max size from event
        let maxSize = 5; // Safe default
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (eventDoc.exists && eventDoc.data()?.maxTeamSize) {
            maxSize = eventDoc.data()!.maxTeamSize;
        }

        const newTeamData = {
            id: teamId,
            teamId: teamId,
            eventId: eventId,
            teamName: teamName,
            leaderId: leaderData.userId,
            leaderName: memberProfiles.find(m => m.userId === leaderData!.userId)?.name || 'Leader',
            maxSize: maxSize,
            status: memberIds.length >= maxSize ? 'locked' : 'open',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            memberIds: memberIds,
            members: memberProfiles.map(m => ({ userId: m.userId, name: m.name, regNo: m.regNo }))
        };

        const batch = db.batch();
        batch.set(db.collection('teams').doc(teamId), newTeamData);

        // Update all members to ensure they point to this precise ID uniformly
        for (const m of members) {
            batch.update(m.docRef, { teamId, teamName: teamName });
        }

        await batch.commit();
        rebuiltCount++;
        console.log(`Rebuilt ${teamId} (${teamName}) with ${memberIds.length} members.`);
    }

    console.log(`\nReconciliation Finished! Reconstructed ${rebuiltCount} orphaned teams.`);
}

runReconciliation().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

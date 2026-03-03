const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const envVars = {};
lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/\\n/g, '\n');
        }
        envVars[match[1]] = val;
    }
});

const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: envVars.GOOGLE_CLIENT_EMAIL,
            privateKey: envVars.GOOGLE_PRIVATE_KEY
        })
    });
}
const db = admin.firestore();

async function main() {
    console.log("Analyzing Database Corruptions...");

    const eventsSnap = await db.collection('events').get();

    // 1. Clean up duplicate registrations in events/{eventId}/registrations
    for (const eventDoc of eventsSnap.docs) {
        const eventId = eventDoc.id;
        console.log(`Checking registrations for event: ${eventId}`);

        const regsSnap = await db.collection('events').doc(eventId).collection('registrations').get();

        // Group by userId
        const userRegs = {};
        regsSnap.forEach(doc => {
            const data = doc.data();
            if (!data.userId) return;
            if (!userRegs[data.userId]) userRegs[data.userId] = [];
            userRegs[data.userId].push({ id: doc.id, data, ref: doc.ref });
        });

        // Resolve duplicates
        for (const [userId, docsList] of Object.entries(userRegs)) {
            if (docsList.length > 1) {
                console.log(`Found ${docsList.length} duplicate registrations for User ${userId} in Event ${eventId}`);

                // Sort to find the "best" document
                // Criteria: 
                // 1. Has teamId
                // 2. Has custom responses
                // 3. Document ID matches userId (the new canonical format)
                docsList.sort((a, b) => {
                    const aScore = (a.id === userId ? 100 : 0) + (a.data.teamId ? 10 : 0) + (a.data.responses && Object.keys(a.data.responses).length > 0 ? 5 : 0) + (a.data.timestamp ? 1 : 0);
                    const bScore = (b.id === userId ? 100 : 0) + (b.data.teamId ? 10 : 0) + (b.data.responses && Object.keys(b.data.responses).length > 0 ? 5 : 0) + (b.data.timestamp ? 1 : 0);
                    return bScore - aScore; // Highest score first
                });

                const bestDoc = docsList[0];
                const docsToDelete = docsList.slice(1);

                console.log(`  -> Keeping best document: ${bestDoc.id} (Team ID: ${bestDoc.data.teamId || 'none'})`);

                for (const toDelete of docsToDelete) {
                    console.log(`  -> Deleting duplicate: ${toDelete.id}`);
                    await toDelete.ref.delete();
                }

                // If the best document doesn't have the UID as its ID, we might want to migrate it
                // For safety right now, let's just delete the totally redundant ones.
            }
        }
    }

    console.log("\nAnalyzing duplicate teams...");
    // 2. Clean up duplicate teams created by the callback override or retries
    const teamsSnap = await db.collection('teams').get();
    const eventLeaderTeams = {};

    teamsSnap.forEach(doc => {
        const data = doc.data();
        if (!data.eventId || !data.leaderId) return;
        const key = `${data.eventId}_${data.leaderId}`;
        if (!eventLeaderTeams[key]) eventLeaderTeams[key] = [];
        eventLeaderTeams[key].push({ id: doc.id, data, ref: doc.ref });
    });

    for (const [key, docsList] of Object.entries(eventLeaderTeams)) {
        if (docsList.length > 1) {
            console.log(`Found ${docsList.length} teams created by the same leader for the same event: ${key}`);

            // Criteria for the "best" team:
            // 1. Has the most members
            // 2. Is actively referenced by a registration

            // First, let's just show them to understand the exact shape of the corruption
            for (const t of docsList) {
                console.log(`  -> Team ${t.id}: ${t.data.teamId}, members: ${t.data.memberIds?.length || 0}`);
            }

            // We'll keep the one with the most members. If tied, keep the older one.
            docsList.sort((a, b) => {
                const aMembers = a.data.memberIds?.length || 0;
                const bMembers = b.data.memberIds?.length || 0;
                if (bMembers !== aMembers) return bMembers - aMembers;
                return (a.data.createdAt?.seconds || 0) - (b.data.createdAt?.seconds || 0); // older first
            });

            const bestTeam = docsList[0];
            const teamsToDelete = docsList.slice(1);

            console.log(`  -> Keeping best team: ${bestTeam.id} (${bestTeam.data.teamId})`);

            for (const toDelete of teamsToDelete) {
                console.log(`  -> Deleting duplicate team: ${toDelete.id} (${toDelete.data.teamId})`);
                await toDelete.ref.delete();
            }
        }
    }

    console.log("Cleanup complete!");
}

main().catch(console.error);

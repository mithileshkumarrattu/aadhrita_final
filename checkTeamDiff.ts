import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
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

async function checkTeams() {
    console.log("Searching EVERY team database globally for '3927' or '4998' or 'TEAM_-_7' or 'SSS'...");

    const collections = ['teams', 'hackathon_teams', 'freefire_teams', 'reg_hackathon'];
    let found = false;
    let results: any = {};

    // Search main root collections
    for (const col of collections) {
        const snap = await db.collection(col).get();
        snap.docs.forEach(d => {
            const data = d.data();
            const docId = d.id;
            const jsonStr = JSON.stringify(data);
            if (jsonStr.includes('3927') || jsonStr.includes('TEAM_-_7') || docId.includes('3927') || docId.includes('TEAM_-_7')
                // Only check SSS in teamId to avoid matching random stuff
                || data.teamId?.includes('SSS')) {
                if (!results[col]) results[col] = [];
                results[col].push({ docId, ...data });
                found = true;
            }
        });
    }

    // Search collectionGroup registrations
    console.log("Searching collectionGroup('registrations')...");
    const regGroups = await db.collectionGroup('registrations').get();
    regGroups.docs.forEach(d => {
        const data = d.data();
        if (data.teamId === 'TEAM_-_7_3927' || data.teamId === 'TEAM_-_ 7 _3927' || data.teamId === 'SSS_4998') {
            if (!results['registrations']) results['registrations'] = [];
            results['registrations'].push({ path: d.ref.path, ...data });
            found = true;
        }
    });

    fs.writeFileSync('output.json', JSON.stringify(results, null, 2));
    console.log("Done writing to output.json");
}

checkTeams().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

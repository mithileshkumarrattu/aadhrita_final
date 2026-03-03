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
    console.log("Searching for 'manmade' and 'handmade' in teams...");
    const refs = await db.collection('teams').get();
    let count = 0;
    refs.forEach(doc => {
        const d = doc.data();
        if (d.teamName) {
            const lower = d.teamName.toLowerCase();
            if (lower.includes('manmade') || lower.includes('handmade')) {
                console.log(`TEAM: doc=${doc.id}, name="${d.teamName}", id="${d.teamId}"`);
                count++;
            }
        }
    });

    console.log("Searching in registrations...");
    const events = await db.collection('events').get();
    for (const event of events.docs) {
        const regs = await db.collection('events').doc(event.id).collection('registrations').get();
        regs.forEach(doc => {
            const d = doc.data();
            let found = false;
            if (d.teamName && (d.teamName.toLowerCase().includes('manmade') || d.teamName.toLowerCase().includes('handmade'))) found = true;
            if (d.responses && d.responses.teamName && (d.responses.teamName.toLowerCase().includes('manmade') || d.responses.teamName.toLowerCase().includes('handmade'))) found = true;

            if (found) {
                console.log(`REG: event=${event.id} user=${doc.id}, teamName="${d.teamName}", responses.teamName="${d.responses?.teamName}"`);
            }
        });
    }
    console.log("Done checking.");
}
main().catch(console.error);

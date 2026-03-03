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

async function checkUsers() {
    const uids = [
        'c2dW63kIfxOxYXiIjP4gHXefFVw2',
        'Fg4XiCZzkcPpl5UVf81vobsq2qf1',
        'qA3dJt20goc5Cfct43aZiAnne3R2'
    ];

    let results: any = {};
    for (const uid of uids) {
        const userDoc = await db.collection('users').doc(uid).get();
        results[uid] = userDoc.data();
    }

    fs.writeFileSync('output_users.json', JSON.stringify(results, null, 2));
    console.log("Written output_users.json");
}

checkUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

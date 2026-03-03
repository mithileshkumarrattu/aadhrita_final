require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const cleanKey = (key) => {
    if (!key) return undefined;
    if (key.includes('...')) return undefined;
    return key.replace(/\\n/g, '\n');
};
const googleKey = cleanKey(process.env.GOOGLE_PRIVATE_KEY);
const firebaseKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY);

if (googleKey && process.env.GOOGLE_CLIENT_EMAIL) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: googleKey,
        }),
    });
} else if (firebaseKey && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: firebaseKey,
        }),
    });
}
const db = admin.firestore();

async function runSweep() {
    try {
        console.log("Sweeping for invalid hasEntryPass on FreeFire/Hackathon exclusively...");
        const usersSnap = await db.collection("users").where('hasEntryPass', '==', true).get();
        let fixedCount = 0;

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            const registeredEvents = userData.registeredEventIds || [];

            // They have an entry pass, but DO THEY have any standard events?
            const standardEvents = registeredEvents.filter(id => id !== 'HACKATHON');

            const isPureSpecial = (userData.hasFreefirePass === true || userData.hasHackathonPass === true) && standardEvents.length === 0;

            if (isPureSpecial) {
                console.log(`Fixing user: ${userData.fullName} (${userDoc.id})`);
                await userDoc.ref.update({ hasEntryPass: false });
                try {
                    await db.collection("registrations").doc(userDoc.id).update({ hasEntryPass: false });
                } catch (e) { }
                fixedCount++;
            }
        }
        console.log(`Successfully reverted ${fixedCount} fake entry passes.`);
    } catch (e) {
        console.error(e);
    }
}
runSweep();

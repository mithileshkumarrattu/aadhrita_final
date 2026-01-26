import * as admin from 'firebase-admin';

// Helper to clean key
const cleanKey = (key: string | undefined) => {
    if (!key) return undefined;
    if (key.includes('...')) return undefined; // Ignore placeholders
    return key.replace(/\\n/g, '\n');
};

if (!admin.apps.length) {
    const googleKey = cleanKey(process.env.GOOGLE_PRIVATE_KEY);
    const firebaseKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY);

    // Prioritize GOOGLE_PRIVATE_KEY as it's the one we just obtained from User
    if (googleKey && process.env.GOOGLE_CLIENT_EMAIL) {
        console.log("Initializing Firebase Admin with GOOGLE_ params");
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
                privateKey: googleKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } else if (firebaseKey && process.env.FIREBASE_CLIENT_EMAIL) {
        console.log("Initializing Firebase Admin with FIREBASE_ params");
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: firebaseKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } else {
        console.warn("Firebase Admin: No valid credentials found.");
    }
}

export const adminDb = admin.firestore();

export const adminStorage = admin.storage();
export const adminAuth = admin.auth();

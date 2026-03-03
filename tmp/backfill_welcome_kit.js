import * as admin from 'firebase-admin';
import * as path from 'path';

// IMPORTANT: Set this to your actual service account key path
const serviceAccountPath = path.resolve(__dirname, 'path/to/your/serviceAccountKey.json');

// Initialize Firebase Admin
try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('Error initializing Firebase Admin. Did you provide the correct serviceAccountKey.json path?');
    console.error(error);
    process.exit(1);
}

const db = admin.firestore();

async function backfillWelcomeKitStatus() {
    console.log('Starting backfill for hasReceivedWelcomeKit...');
    let updatedCount = 0;
    let skippedCount = 0;

    try {
        // Get all users who have an entry pass
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('hasEntryPass', '==', true).get();

        if (snapshot.empty) {
            console.log('No users found with hasEntryPass = true.');
            return;
        }

        console.log(`Found ${snapshot.size} paid users. Processing...`);

        // Use a batch to perform updates efficiently
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Only update if the field doesn't already exist
            if (data.hasReceivedWelcomeKit === undefined) {
                batch.update(doc.ref, { hasReceivedWelcomeKit: false });
                updatedCount++;
                batchCount++;

                // Firestore batches are limited to 500 operations
                if (batchCount === 500) {
                    await batch.commit();
                    console.log(`Committed batch of 500 updates...`);
                    batch = db.batch();
                    batchCount = 0;
                }
            } else {
                skippedCount++;
            }
        }

        // Commit any remaining operations in the final batch
        if (batchCount > 0) {
            await batch.commit();
        }

        console.log('--- Backfill Complete ---');
        console.log(`Total users checked: ${snapshot.size}`);
        console.log(`Successfully updated: ${updatedCount}`);
        console.log(`Skipped (already had field): ${skippedCount}`);

    } catch (error) {
        console.error('Error during backfill:', error);
    }
}

backfillWelcomeKitStatus();

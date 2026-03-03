import { adminDb } from './src/lib/firebase-admin';

async function run() {
    // Find the user who created "sss" or "TEAM_-_7_3927"
    const teamsRef = adminDb.collection('teams');
    const q1 = await teamsRef.where('teamName', '==', 'sss').get();
    console.log("Found SSS Teams:");
    q1.forEach(doc => console.log(doc.id, doc.data()));

    const q2 = await teamsRef.where('teamId', '==', 'TEAM_-_7_3927').get();
    console.log("Found TEAM 7:");
    q2.forEach(doc => console.log(doc.id, doc.data()));

    // Also let's find the registrations for the leader of TEAM_-_7_3927
    if (!q2.empty) {
        const leaderId = q2.docs[0].data().leaderId;
        const regs = await adminDb.collectionGroup('registrations').where('userId', '==', leaderId).get();
        console.log("Leader Registrations:");
        regs.forEach(doc => console.log(doc.ref.path, doc.data()));
    }
}
run();

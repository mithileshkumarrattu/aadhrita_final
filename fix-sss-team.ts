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

async function fixSpecificTeam() {
    console.log("Rebuilding SSS_4998 and migrating TEAM_-_7_3927 members...");

    const eventId = "bridge-craft-challenge";

    // The users
    const leaderUid = "c2dW63kIfxOxYXiIjP4gHXefFVw2"; // Lakshmi
    const member1Uid = "Fg4XiCZzkcPpl5UVf81vobsq2qf1"; // Rabia
    const member2Uid = "qA3dJt20goc5Cfct43aZiAnne3R2"; // Susmitha

    // Fetch user profiles
    const [leaderDoc, m1Doc, m2Doc] = await Promise.all([
        db.collection('users').doc(leaderUid).get(),
        db.collection('users').doc(member1Uid).get(),
        db.collection('users').doc(member2Uid).get(),
    ]);

    const leaderData = leaderDoc.data()!;
    const m1Data = m1Doc.data()!;
    const m2Data = m2Doc.data()!;

    // Create the master team document SSS_4998
    const teamDocRef = db.collection('teams').doc('SSS_4998');
    const newTeamData = {
        id: 'SSS_4998', // Force the ID
        teamId: 'SSS_4998',
        eventId: eventId,
        teamName: 'SSS',
        leaderId: leaderUid,
        leaderName: leaderData.fullName || leaderData.displayName || 'Leader',
        maxSize: 3,
        status: 'locked', // It's full!
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        memberIds: [leaderUid, member1Uid, member2Uid],
        members: [
            { userId: leaderUid, name: leaderData.fullName, regNo: leaderData.regNo || '' },
            { userId: member1Uid, name: m1Data.fullName, regNo: m1Data.regNo || '' },
            { userId: member2Uid, name: m2Data.fullName, regNo: m2Data.regNo || '' }
        ]
    };

    const batch = db.batch();

    // 1. Create the team
    batch.set(teamDocRef, newTeamData);

    // 2. Update all 3 user registrations
    const regRefLeader = db.collection('events').doc(eventId).collection('registrations').doc('7c6XBXDAb3EXtKqdaYF6');
    batch.update(regRefLeader, { teamId: 'SSS_4998', teamName: 'SSS', role: 'Leader' });

    const regRefM1 = db.collection('events').doc(eventId).collection('registrations').doc('EdV91dIiNeMQBSVeUJ45');
    batch.update(regRefM1, { teamId: 'SSS_4998', teamName: 'SSS', role: 'Member' });

    const regRefM2 = db.collection('events').doc(eventId).collection('registrations').doc('HPP7wAl7zAJGMOqTb4iK');
    batch.update(regRefM2, { teamId: 'SSS_4998', teamName: 'SSS', role: 'Member' });

    await batch.commit();

    console.log("Successfully rebuilt SSS_4998 and migrated the members!");
}

fixSpecificTeam().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

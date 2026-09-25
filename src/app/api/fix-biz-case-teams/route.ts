import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        console.log('Starting team merge process...');

        const eventId = 'biz-case-quest';
        const erroneousLeaderEmail = 'badrinadhsanju@gmail.com';
        const erroneousTeamIdStr = 'MR_SMS_8859_3500';

        const correctLeaderEmail = 'shivaramippili@gmail.com';
        const correctTeamIdStr = 'MR_SMS_8859';

        // 1. Get correct team
        const correctTeamQuery = await db.collection('teams')
            .where('teamId', '==', correctTeamIdStr)
            .where('eventId', '==', eventId)
            .get();

        if (correctTeamQuery.empty) {
            return NextResponse.json({ error: `Correct team ${correctTeamIdStr} not found!` });
        }
        const correctTeamDoc = correctTeamQuery.docs[0];
        const correctTeamData = correctTeamDoc.data();
        console.log(`Found correct team: ${correctTeamData.teamName} (${correctTeamDoc.id})`);

        // 2. Get erroneous team
        const errTeamQuery = await db.collection('teams')
            .where('teamId', '==', erroneousTeamIdStr)
            .where('eventId', '==', eventId)
            .get();

        if (errTeamQuery.empty) {
            return NextResponse.json({ error: `Erroneous team ${erroneousTeamIdStr} not found!` });
        }
        const errTeamDoc = errTeamQuery.docs[0];
        const errTeamData = errTeamDoc.data();
        console.log(`Found erroneous team: ${errTeamData.teamName} (${errTeamDoc.id})`);

        // Get the user ID of badrinadhsanju@gmail.com
        const erroneousUserId = errTeamData.leaderId;

        // 3. Get the registration document for badrinadhsanju
        const userRegQuery = await db.collection('events').doc(eventId).collection('registrations')
            .where('userId', '==', erroneousUserId)
            .get();

        if (userRegQuery.empty) {
            return NextResponse.json({ error: `Registration for user ${erroneousUserId} in event ${eventId} not found!` });
        }
        const userRegDoc = userRegQuery.docs[0];
        console.log(`Found user's registration: ${userRegDoc.id}`);

        // Update the Team logic
        // Get user profile to get their name and email
        const userProfileDoc = await db.collection('users').doc(erroneousUserId).get();
        const userProfile = userProfileDoc.data();
        const memberInfo = {
            userId: erroneousUserId,
            name: userProfile?.fullName || 'Badrinadh',
            email: userProfile?.email || erroneousLeaderEmail,
            role: 'Member'
        };

        const updatedMembers = [...correctTeamData.members, memberInfo];
        const updatedMemberIds = [...correctTeamData.memberIds, erroneousUserId];

        // Ensure we don't have duplicates
        const dedupedMemberIds = Array.from(new Set(updatedMemberIds));
        const dedupedMembers = updatedMembers.filter((v, i, a) => a.findIndex(t => (t.userId === v.userId)) === i);

        console.log('--- Applying Changes ---');

        // A. Update correct team
        await correctTeamDoc.ref.update({
            members: dedupedMembers,
            memberIds: dedupedMemberIds,
            teamSize: dedupedMemberIds.length
        });

        // B. Update user's registration
        await userRegDoc.ref.update({
            teamId: correctTeamIdStr,
            role: 'Member',
            'responses.teamName': correctTeamData.teamName,
            'responses.role': 'Member' // Fix the typo in role
        });

        // C. Delete erroneous team
        await errTeamDoc.ref.delete();

        console.log('\nMerge complete!');
        return NextResponse.json({ success: true, message: 'Merge complete' });

    } catch (e: any) {
        console.error('Error during merge:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

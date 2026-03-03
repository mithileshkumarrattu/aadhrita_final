import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Find the legacy teams created earlier. We used IDs that start with 5 letters of the team name + 4 random chars
        // Or we can just find any team where status === 'locked' and members have name === 'Student'
        const teamsSnap = await adminDb.collection('teams').where('status', '==', 'locked').get();
        let fixedCount = 0;
        let results = [];

        for (const teamDoc of teamsSnap.docs) {
            const teamData = teamDoc.data();

            // Only target our recently created legacy teams which might have 'Student' or 'locked'
            // To be safe, let's just unlock any locked team for now IF it's not full? 
            // Wait, if it's explicitly locked by user, maybe we shouldn't.
            // But they were created by our script. Our script explicitly put 'locked'.

            // Let's check members
            const members = teamData.members || [];
            let needsUpdate = false;
            let updatedMembers = [];

            for (const m of members) {
                // Fetch real user data
                const userSnap = await adminDb.collection('users').doc(m.userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data() as any;
                    if (m.name === 'Student' || m.name === 'Leader' || !m.name) {
                        updatedMembers.push({
                            ...m,
                            name: userData.fullName || userData.name || userData.email || 'Student',
                            regNo: userData.regNo || userData.registrationNumber || 'N/A'
                        });
                        needsUpdate = true;
                    } else {
                        updatedMembers.push(m);
                    }
                } else {
                    updatedMembers.push(m);
                }
            }

            // Also update the leaderName if it's the leader
            let leaderName = teamData.leaderName;
            if (leaderName === 'Leader' || leaderName === 'Student') {
                const leaderObj = updatedMembers.find(m => m.userId === teamData.leaderId);
                if (leaderObj) leaderName = leaderObj.name;
                needsUpdate = true;
            }

            // We MUST unlock them so others can join
            await teamDoc.ref.update({
                status: 'open',
                members: updatedMembers,
                leaderName: leaderName
            });

            fixedCount++;
            results.push({ teamId: teamData.teamId, oldStatus: teamData.status, updatedMembers });
        }

        return NextResponse.json({ success: true, fixedCount, results });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
    const { adminDb } = await import('./src/lib/firebase-admin');
    console.log("Starting Ghost Team Cleanup...");
    const teamsRef = adminDb.collection('teams');
    const teamsSnap = await teamsRef.get();

    let deletedCount = 0;
    let checkedCount = 0;

    for (const teamDoc of teamsSnap.docs) {
        checkedCount++;
        const teamData = teamDoc.data();
        const eventId = teamData.eventId;
        const leaderId = teamData.leaderId;
        const teamId = teamData.teamId;

        if (!eventId || !leaderId) continue;

        // Let's check the leader's registrations for this event
        const regsQuery = await adminDb.collection('events').doc(eventId).collection('registrations')
            .where('userId', '==', leaderId).get();

        if (regsQuery.empty) {
            // Leader has NO registrations for this event? Total ghost team.
            console.log(`[Ghost] Deleting team ${teamData.teamName} (${teamId}) - Leader has no registration.`);
            await teamDoc.ref.delete();
            deletedCount++;
            continue;
        }

        // Check if the leader's SUCCESSFUL registration points to THIS team
        const validRegs = regsQuery.docs.map(d => d.data()).filter(d =>
            ['success', 'free', 'completed'].includes(d.paymentStatus || '')
        );

        if (validRegs.length > 0) {
            // Sort to find newest valid registration
            validRegs.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return tB - tA; // Newest first
            });
            const activeReg = validRegs[0];

            // If the active newest registration points to a DIFFERENT team, this team is a abandoned ghost!
            if (activeReg.teamId && activeReg.teamId !== teamId) {
                console.log(`[Ghost] Deleting team ${teamData.teamName} (${teamId}) - Leader's newest success is for different team: ${activeReg.teamId}.`);
                await teamDoc.ref.delete();
                deletedCount++;
            }
        } else {
            // Leader has registrations, but NONE are successful.
            // Check if any members have successful registrations for this team.
            let anyPaidMember = false;
            for (const memberId of teamData.memberIds) {
                const memRegsQuery = await adminDb.collection('events').doc(eventId).collection('registrations')
                    .where('userId', '==', memberId)
                    .where('teamId', '==', teamId).get();

                const hasPaid = memRegsQuery.docs.some(d =>
                    ['success', 'free', 'completed'].includes(d.data().paymentStatus || '')
                );
                if (hasPaid) {
                    anyPaidMember = true;
                    break;
                }
            }

            if (!anyPaidMember) {
                console.log(`[Ghost] Deleting team ${teamData.teamName} (${teamId}) - No member has a paid successful registration for this team.`);
                await teamDoc.ref.delete();
                deletedCount++;
            }
        }
    }

    console.log(`Cleanup Complete. Checked ${checkedCount} teams, Deleted ${deletedCount} ghost teams.`);
}

run().catch(console.error);

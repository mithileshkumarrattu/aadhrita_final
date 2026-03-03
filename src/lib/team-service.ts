import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export interface TeamMember {
    userId: string;
    name: string;
    regNo: string;
}

export interface Team {
    id: string; // Firestore Doc ID
    teamId: string; // Unique Readable ID (e.g. TITANS_1234)
    eventId: string;
    teamName: string;
    leaderId: string;
    leaderName: string;
    memberIds: string[]; // For filtering
    members: TeamMember[]; // For display
    maxSize: number;
    status: 'open' | 'locked';
    createdAt: any;
}

/**
 * Checks if a Team Name is available for a specific Event.
 * Enforces per-event uniqueness.
 */
export const isTeamNameAvailable = async (eventId: string, teamName: string): Promise<boolean> => {
    const normalize = (s: string) => s.trim().toUpperCase();
    const q = query(
        collection(db, 'teams'),
        where('eventId', '==', eventId),
        where('teamName', '==', teamName) // Verify if exact match works or need normalization field
    );
    // Note: Firestore is case-sensitive. Ideally we should store a normalized field.
    // For now, checking exact match. Client should trim.
    const snap = await getDocs(q);
    return snap.empty;
};

/**
 * Creates a new Team.
 * Uses a Transaction to ensure name uniqueness race-conditions are handled (best effort)
 * or simply creates if check passes.
 */
export const createTeam = async (
    eventId: string,
    teamName: string,
    leader: TeamMember,
    maxSize: number
): Promise<{ success: boolean; teamId?: string; error?: string }> => {
    try {
        const q = query(
            collection(db, 'teams'),
            where('eventId', '==', eventId),
            where('teamName', '==', teamName)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            const existingTeam = snap.docs[0].data() as Team;
            // If the user trying to create the team is ALREADY the leader, allow it (idempotent retry)
            if (existingTeam.leaderId === leader.userId) {
                return { success: true, teamId: existingTeam.teamId };
            }
            return { success: false, error: "Team Name already taken for this event by another user." };
        }

        const newDocRef = doc(collection(db, 'teams'));
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
        const readableTeamId = `${teamName.toUpperCase().replace(/\s+/g, '_')}_${uniqueSuffix}`;

        const newTeam: Team = {
            id: newDocRef.id,
            teamId: readableTeamId,
            eventId,
            teamName,
            leaderId: leader.userId,
            leaderName: leader.name,
            memberIds: [leader.userId],
            members: [leader],
            maxSize,
            status: 'open',
            createdAt: serverTimestamp()
        };

        await setDoc(newDocRef, newTeam);
        return { success: true, teamId: readableTeamId };
    } catch (error: any) {
        console.error("Create Team Error", error);
        return { success: false, error: error.message };
    }
};

/**
 * Joins an existing Team.
 */
export const joinTeam = async (
    eventId: string,
    teamIdentifier: string, // The Readable ID (e.g. TITANS_1234) or Name
    member: TeamMember
): Promise<{ success: boolean; teamName?: string; resolvedTeamId?: string; error?: string }> => {
    try {
        const ident = teamIdentifier.trim();
        let q = query(collection(db, 'teams'), where('teamId', '==', ident), where('eventId', '==', eventId));
        let snap = await getDocs(q);

        // Fallback to Uppercase
        if (snap.empty) {
            q = query(collection(db, 'teams'), where('teamId', '==', ident.toUpperCase()), where('eventId', '==', eventId));
            snap = await getDocs(q);
        }

        // Fallback: Check By Team Name
        if (snap.empty) {
            q = query(collection(db, 'teams'), where('teamName', '==', ident), where('eventId', '==', eventId));
            snap = await getDocs(q);
        }

        if (snap.empty) return { success: false, error: "Invalid Team ID or Team Name not found for this event." };

        const teamDoc = snap.docs[0];
        const teamData = teamDoc.data() as Team;

        if (teamData.memberIds.includes(member.userId)) {
            return { success: true, teamName: teamData.teamName, resolvedTeamId: teamData.teamId }; // Already joined
        }

        const eventSnap = await getDoc(doc(db, 'events', eventId));
        const trueMaxSize = eventSnap.exists() ? (eventSnap.data().maxTeamSize || teamData.maxSize) : teamData.maxSize;

        if (teamData.members.length >= trueMaxSize) {
            // TEAM IS FULL. But wait! Let's check for "ghosts" (people who abandoned checkout).
            const qRegs = query(
                collection(db, 'events', teamData.eventId, 'registrations'),
                where('teamId', '==', teamData.teamId)
            );
            const regsSnap = await getDocs(qRegs);

            // Re-verify the payment status of all current members
            let evictionCandidateIndex = -1;

            for (let i = 0; i < teamData.members.length; i++) {
                const existingMember = teamData.members[i];
                // Leaders can't be evicted
                if (existingMember.userId === teamData.leaderId) continue;

                const regInfo = regsSnap.docs.find(d => d.data().userId === existingMember.userId)?.data();

                // If they don't even have a registration document yet, or their status isn't success/free/completed,
                // they are a ghost taking up a slot!
                if (!regInfo || !['success', 'free', 'completed'].includes(regInfo.paymentStatus)) {
                    evictionCandidateIndex = i;
                    break;
                }
            }

            if (evictionCandidateIndex !== -1) {
                // A ghost was found! Evict them to make room for our new incoming member.
                const updatedMembers = [...teamData.members];
                const updatedMemberIds = [...teamData.memberIds];

                updatedMembers.splice(evictionCandidateIndex, 1);
                updatedMemberIds.splice(evictionCandidateIndex, 1);

                updatedMembers.push(member);
                updatedMemberIds.push(member.userId);

                await updateDoc(teamDoc.ref, {
                    members: updatedMembers,
                    memberIds: updatedMemberIds
                });

                return { success: true, teamName: teamData.teamName, resolvedTeamId: teamData.teamId };
            }

            return { success: false, error: "Team is full with confirmed registrations." };
        }

        if (teamData.status === 'locked') {
            return { success: false, error: "Team is locked" };
        }

        // Atomically Add Member (Normal flow, room available)
        await updateDoc(teamDoc.ref, {
            memberIds: arrayUnion(member.userId),
            members: arrayUnion(member)
        });

        return { success: true, teamName: teamData.teamName, resolvedTeamId: teamData.teamId };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Verifies a Team ID logic for the UI (without joining)
 */
export const verifyTeamId = async (eventId: string, teamId: string): Promise<boolean> => {
    let q = query(collection(db, 'teams'), where('teamId', '==', teamId), where('eventId', '==', eventId));
    let snap = await getDocs(q);

    if (snap.empty) {
        q = query(collection(db, 'teams'), where('teamId', '==', teamId.toUpperCase()), where('eventId', '==', eventId));
        snap = await getDocs(q);
    }

    if (snap.empty) throw new Error("Team ID not found for this event");

    const teamDoc = snap.docs[0];
    const teamData = teamDoc.data() as Team;

    if (teamData.status === 'locked') throw new Error("Team is locked");

    const eventSnap = await getDoc(doc(db, 'events', eventId));
    const trueMaxSize = eventSnap.exists() ? (eventSnap.data().maxTeamSize || teamData.maxSize) : teamData.maxSize;

    if (teamData.members.length >= trueMaxSize) {
        // TEAM APPEARS FULL. Check for ghosts before rejecting on the UI.
        const qRegs = query(
            collection(db, 'events', teamData.eventId, 'registrations'),
            where('teamId', '==', teamData.teamId)
        );
        const regsSnap = await getDocs(qRegs);

        let hasGhost = false;
        for (let i = 0; i < teamData.members.length; i++) {
            const existingMember = teamData.members[i];
            if (existingMember.userId === teamData.leaderId) continue;

            const regInfo = regsSnap.docs.find(d => d.data().userId === existingMember.userId)?.data();
            if (!regInfo || !['success', 'free', 'completed'].includes(regInfo.paymentStatus)) {
                hasGhost = true;
                break;
            }
        }

        if (!hasGhost) {
            throw new Error("Team is strictly full with paid/confirmed members");
        }
    }

    return true;
};

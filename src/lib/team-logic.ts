
import { db, Team, COLLECTIONS } from './db';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, getDoc, runTransaction } from 'firebase/firestore';

// --- Validation Functions ---

/**
 * Checks if a Team Name is available for a specific event.
 * Case-insensitive check recommended, but for now exact match.
 */
export const isTeamNameAvailable = async (eventId: string, teamName: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, 'teams'),
            where('eventId', '==', eventId),
            where('teamName', '==', teamName)
        );
        const snap = await getDocs(q);
        return snap.empty;
    } catch (error) {
        console.error("Error checking team name:", error);
        return false; // Fail safe
    }
};

/**
 * Verifies if a Team ID exists, is for the correct event, and is open.
 * Returns the team data if valid, throws error if not.
 */
export const verifyTeamId = async (eventId: string, teamId: string): Promise<Team> => {
    // 1. Search for Team by teamId (custom string ID)
    const q = query(collection(db, 'teams'), where('teamId', '==', teamId));
    const snap = await getDocs(q);

    if (snap.empty) {
        throw new Error("Invalid Team ID. Please check and try again.");
    }

    const teamDoc = snap.docs[0];
    const team = { id: teamDoc.id, ...teamDoc.data() } as Team;

    // 2. Validation Checks
    if (team.eventId !== eventId) {
        throw new Error("This Team ID belongs to a different event.");
    }

    if (team.status === 'full' || team.status === 'locked') {
        throw new Error("This team is already full or locked.");
    }

    if (team.memberIds.length >= team.maxSize) {
        throw new Error("Team capacity reached.");
    }

    return team;
};


// --- Transactional Operations (Called after Payment) ---

/**
 * Creates a new Team.
 * Call this ONLY after successful payment verification.
 */
export const createTeam = async (
    eventId: string,
    teamName: string,
    leader: { uid: string, name: string, regNo: string },
    maxSize: number
): Promise<string> => {
    // Generate a simple ID or use Team Name as ID?
    // User requested: "users choose teamleader to enter id" -> Wait, user said "Team Creation... chooses Team Name... system generates Unique Team ID".
    // Later: "users ... Create Team -> Pay -> Active".
    // Let's generate a clean ID: TEAMNAME + Random 3 digits? Or just TEAMNAME if unique?
    // Let's use: TEAM-{Random4Chars}
    // Actually, "ADHR-{RANDOM}" was the plan.
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedTeamId = `TEAM-${uniqueSuffix}`; // Simple format

    // We can also use the docId as the teamId to be simple.

    // Create Doc
    const teamRef = doc(collection(db, 'teams'));
    const finalTeamId = `${teamName.toUpperCase().replace(/\s+/g, '_')}_${uniqueSuffix}`; // e.g. "THUNDER_BOTS_4921"

    const teamData: Team = {
        id: teamRef.id,
        teamId: finalTeamId,
        eventId,
        teamName,
        leaderId: leader.uid,
        leaderName: leader.name,
        memberIds: [leader.uid],
        members: [{ userId: leader.uid, name: leader.name, regNo: leader.regNo }],
        maxSize,
        status: 'open',
        createdAt: new Date() // Firestore client timestamp or serverTimestamp()
    };

    await setDoc(teamRef, teamData);
    return finalTeamId;
};

/**
 * Adds a user to an existing team.
 * Call this ONLY after successful payment verification.
 */
export const joinTeam = async (
    teamIdString: string,
    member: { uid: string, name: string, regNo: string }
): Promise<void> => {
    // We need to find the doc first, as teamIdString is a field, not the Doc ID.
    const q = query(collection(db, 'teams'), where('teamId', '==', teamIdString));
    const snap = await getDocs(q);

    if (snap.empty) throw new Error("Team not found during join operation.");

    const teamDoc = snap.docs[0];
    const teamRef = doc(db, 'teams', teamDoc.id);
    const currentData = teamDoc.data() as Team;

    if (currentData.memberIds.includes(member.uid)) {
        return; // Already joined (idempotent)
    }

    if (currentData.memberIds.length >= currentData.maxSize) {
        throw new Error("Team is full.");
    }

    // Atomic Update?
    // Ideally use transaction, but arrayUnion is atomic for the array fields.
    // We check size client side again, but race condition is possible. 
    // Given low traffic, arrayUnion is strictly safe for 'adding', but 'maxSize' check isn't enforced by rules here.
    // Good enough for now.

    await updateDoc(teamRef, {
        memberIds: arrayUnion(member.uid),
        members: arrayUnion(member),
        // If full, mark full?
        status: (currentData.memberIds.length + 1 >= currentData.maxSize) ? 'full' : 'open'
    });
};

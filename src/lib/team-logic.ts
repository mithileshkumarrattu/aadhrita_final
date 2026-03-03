
import { createTeam as serviceCreateTeam, joinTeam as serviceJoinTeam, verifyTeamId as serviceVerifyId, isTeamNameAvailable as serviceCheckName, TeamMember } from './team-service';

// --- Re-exports & Compatibility Wrappers ---

export const isTeamNameAvailable = serviceCheckName;

export const verifyTeamId = async (eventId: string, teamId: string) => {
    return serviceVerifyId(eventId, teamId);
}

export const createTeam = async (
    eventId: string,
    teamName: string,
    leader: { uid: string, name: string, regNo: string },
    maxSize: number
): Promise<string> => {
    // Map 'uid' to 'userId' for the new service
    const member: TeamMember = {
        userId: leader.uid,
        name: leader.name,
        regNo: leader.regNo
    };

    const result = await serviceCreateTeam(eventId, teamName, member, maxSize);
    if (!result.success) {
        throw new Error(result.error);
    }
    return result.teamId!;
}

export const joinTeam = async (
    eventId: string,
    teamId: string,
    member: { uid: string, name: string, regNo: string }
): Promise<{ resolvedTeamId: string; resolvedTeamName: string }> => {
    const teamMember: TeamMember = {
        userId: member.uid,
        name: member.name,
        regNo: member.regNo
    };

    const result = await serviceJoinTeam(eventId, teamId, teamMember);
    if (!result.success) {
        throw new Error(result.error);
    }
    return { resolvedTeamId: result.resolvedTeamId!, resolvedTeamName: result.teamName! };
}

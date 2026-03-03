import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as crypto from 'crypto';

// TEST-ONLY: Simulate a successful payment callback for hackathon teams
// This route ONLY works in development (NODE_ENV !== production)
export async function POST(req: NextRequest) {
    // SAFETY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Test gateway disabled in production' }, { status: 403 });
    }

    try {
        const { teamId, userId, email, amount, studentName, phone } = await req.json();

        if (!teamId) {
            return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
        }

        // 1. Fetch the team
        const teamSnap = await adminDb.collection("hackathon_teams").doc(teamId).get();
        if (!teamSnap.exists) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        const teamData = teamSnap.data()!;

        // 2. Create a mock transaction
        const orderId = `TEST_HACK_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        await adminDb.collection("transactions").add({
            orderId,
            userId: userId || null,
            eventIds: ['HACKATHON'],
            teamId,
            studentName: studentName || teamData.leader?.name || 'Test User',
            email: email || teamData.leader?.email || 'test@test.com',
            phone: phone || teamData.leader?.phone || '0000000000',
            amount: amount || '600',
            status: 'SUCCESS',
            paymentMethod: 'TEST_GATEWAY',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // 3. Update team payment status
        await teamSnap.ref.update({
            paymentStatus: 'paid',
            transactionId: orderId
        });

        // 4. Generate pass tokens for each member
        const passTokens: { name: string; token: string; isLeader: boolean }[] = [];
        const allMembers = [
            { ...teamData.leader, isLeader: true },
            ...(teamData.members || []).map((m: any) => ({ ...m, isLeader: false }))
        ];

        for (const member of allMembers) {
            const token = crypto.randomBytes(12).toString('hex'); // 24-char URL-safe
            passTokens.push({ name: member.name, token, isLeader: member.isLeader });

            // Create individual pass doc
            await adminDb.collection("hackathon_passes").add({
                token,
                teamId,
                teamName: teamData.teamName,
                memberName: member.name,
                memberRegNo: member.regNo || '',
                memberEmail: member.email || '',
                memberPhone: member.phone || '',
                memberIdCardUrl: member.idCardUrl || '',
                isLeader: member.isLeader,
                accommodation: member.accommodation || { mar11: false, mar13: false },
                collegeName: teamData.collegeName || '',
                createdAt: new Date().toISOString()
            });
        }

        // 5. Save pass tokens to team doc
        await teamSnap.ref.update({ passTokens });

        // 6. Update user doc (if userId provided)
        // NOTE: Do NOT set hasEntryPass for hackathon — that's for general entry passes only.
        // Hackathon participants get hackathon_passes, not entry passes.
        if (userId) {
            try {
                await adminDb.collection("users").doc(userId).update({
                    isOnboarded: true,
                    hasHackathonPass: true
                });
            } catch (e) {
                // User doc might not exist in test, that's ok
                console.log("Could not update user doc:", e);
            }
        }

        return NextResponse.json({
            success: true,
            orderId,
            passTokens,
            message: `Test payment successful! Generated ${passTokens.length} passes.`
        });

    } catch (error: any) {
        console.error("Test Callback Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

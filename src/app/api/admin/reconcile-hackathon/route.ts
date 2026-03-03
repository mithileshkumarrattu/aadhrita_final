import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// Admin-only API to reconcile hackathon payments that succeeded but passes were never generated.
// Usage: POST /api/admin/reconcile-hackathon
// Body: { "adminSecret": "...", "teamId": "optional-team-id", "orderId": "optional-order-id" }

const ADMIN_SECRET = process.env.ADMIN_SECRET || "mvgr_admin_2026";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { adminSecret, teamId, orderId } = body;

        if (adminSecret !== ADMIN_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const results: any[] = [];

        // --- MODE 1: Reconcile a specific team by teamId ---
        if (teamId) {
            const result = await reconcileTeam(teamId, orderId);
            results.push(result);
            return NextResponse.json({ success: true, results });
        }

        // --- MODE 2: Reconcile ALL transactions with status=SUCCESS but team has no passes ---
        const txSnap = await adminDb.collection("transactions")
            .where("eventIds", "array-contains", "HACKATHON")
            .where("status", "==", "SUCCESS")
            .get();

        console.log(`Reconcile: Found ${txSnap.size} SUCCESS hackathon transactions`);

        for (const txDoc of txSnap.docs) {
            const tx = txDoc.data();
            const tid = tx.teamId;
            if (!tid) {
                results.push({ orderId: tx.orderId, status: "SKIP", reason: "No teamId in transaction" });
                continue;
            }

            // Check if passes already exist
            const passSnap = await adminDb.collection("hackathon_passes")
                .where("teamId", "==", tid).get();
            if (!passSnap.empty) {
                results.push({ orderId: tx.orderId, teamId: tid, status: "SKIP", reason: "Passes already exist" });
                continue;
            }

            const result = await reconcileTeam(tid, tx.orderId);
            results.push({ orderId: tx.orderId, ...result });
        }

        return NextResponse.json({ success: true, processed: results.length, results });

    } catch (error: any) {
        console.error("Reconcile Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function reconcileTeam(teamId: string, orderId?: string) {
    let teamDoc: any = null;
    let teamData: any = null;
    let foundIn = "";

    // Try both collections
    for (const col of ["hackathon_teams", "reg_hackathon"]) {
        const snap = await adminDb.collection(col).doc(teamId).get();
        if (snap.exists) {
            teamDoc = snap;
            teamData = snap.data();
            foundIn = col;
            break;
        }
    }

    if (!teamDoc || !teamData) {
        return { teamId, status: "ERROR", reason: `Team not found in hackathon_teams or reg_hackathon` };
    }

    // Mark team as paid
    await teamDoc.ref.update({
        paymentStatus: "paid",
        transactionId: orderId || "MANUAL_RECONCILE",
        reconciledAt: new Date().toISOString()
    });

    // Generate passes for all members
    const crypto = require("crypto");
    const passTokens: any[] = [];
    const allMembers = [
        { ...teamData.leader, isLeader: true },
        ...(teamData.members || []).map((m: any) => ({ ...m, isLeader: false }))
    ];

    for (const member of allMembers) {
        const token = crypto.randomBytes(12).toString("hex");
        passTokens.push({ name: member.name, token, isLeader: member.isLeader });

        await adminDb.collection("hackathon_passes").add({
            token,
            teamId: teamDoc.id,
            teamName: teamData.teamName,
            memberName: member.name,
            memberRegNo: member.regNo || "",
            memberEmail: member.email || "",
            memberPhone: member.phone || "",
            memberIdCardUrl: member.idCardUrl || "",
            isLeader: member.isLeader,
            accommodation: member.accommodation || { mar11: false, mar13: false },
            collegeName: teamData.collegeName || "",
            reconciledAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    }

    await teamDoc.ref.update({ passTokens });

    // Also update the leader's user doc if we can find them by email
    if (teamData.leader?.email) {
        const userSnap = await adminDb.collection("users")
            .where("email", "==", teamData.leader.email).get();
        if (!userSnap.empty) {
            await userSnap.docs[0].ref.update({
                hasHackathonPass: true
            });
        }
    }

    console.log(`Reconcile: Team ${teamId} (${foundIn}) → ${allMembers.length} passes generated`);
    return {
        teamId,
        foundIn,
        teamName: teamData.teamName,
        membersCount: allMembers.length,
        status: "OK",
        passTokens: passTokens.map(p => p.name)
    };
}

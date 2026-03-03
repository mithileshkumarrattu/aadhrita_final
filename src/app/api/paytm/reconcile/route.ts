import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

/**
 * POST /api/paytm/reconcile
 * Body: { orderId: string; adminKey: string }
 * 
 * Admin-triggered endpoint to manually re-process a payment that succeeded
 * on Paytm's side but where our callback failed (pass not generated, DB not updated).
 * 
 * Works by re-running processSuccessfulPayment() for the given orderId.
 * This is idempotent — it is safe to call multiple times.
 */
export async function POST(req: NextRequest) {
    try {
        const { orderId, adminKey } = await req.json();

        // Simple admin key check — set ADMIN_RECONCILE_KEY in env vars
        if (adminKey !== process.env.ADMIN_RECONCILE_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!orderId) {
            return NextResponse.json({ error: "orderId is required" }, { status: 400 });
        }

        // Find the transaction
        const txnSnap = await adminDb.collection("transactions")
            .where("orderId", "==", orderId).get();

        if (txnSnap.empty) {
            return NextResponse.json({ error: `Transaction not found: ${orderId}` }, { status: 404 });
        }

        const txnDoc = txnSnap.docs[0];
        const transaction = txnDoc.data();

        if (transaction.status !== 'SUCCESS') {
            return NextResponse.json({
                error: `Transaction status is '${transaction.status}', not SUCCESS. Cannot reconcile non-successful payments.`
            }, { status: 400 });
        }

        console.log(`[Reconcile] Re-processing orderId=${orderId} userId=${transaction.userId}`);

        const steps = [];
        const errors = [];

        // Step 1: Update users collection
        try {
            const eventIds = transaction.eventIds || [];
            const nonHackathonEvents = eventIds.filter((id: string) => id !== 'HACKATHON');
            const isHackathonOnly = nonHackathonEvents.length === 0 && eventIds.includes('HACKATHON');

            const userArgs: Record<string, any> = { isOnboarded: true };
            if (!isHackathonOnly) userArgs.hasEntryPass = true;
            else userArgs.hasHackathonPass = true;
            if (eventIds.length > 0) userArgs.registeredEventIds = admin.firestore.FieldValue.arrayUnion(...eventIds);

            await adminDb.collection("users").doc(transaction.userId).set(userArgs, { merge: true });
            steps.push('users collection updated');
        } catch (e: any) {
            errors.push(`users update failed: ${e.message}`);
        }

        // Step 2: Hackathon pass (if applicable)
        const eventIds = transaction.eventIds || [];
        if (eventIds.includes('HACKATHON')) {
            try {
                const crypto = require('crypto');
                const teamId = transaction.teamId;
                let teamDoc: FirebaseFirestore.DocumentSnapshot | null = null;

                // Try all sources
                for (const col of [transaction.teamCollection, 'hackathon_teams', 'reg_hackathon'].filter(Boolean)) {
                    if (teamId) {
                        const snap = await adminDb.collection(col).doc(teamId).get();
                        if (snap.exists) { teamDoc = snap; break; }
                    }
                }
                if (!teamDoc && transaction.email) {
                    for (const col of ['hackathon_teams', 'reg_hackathon']) {
                        const q = await adminDb.collection(col).where("leader.email", "==", transaction.email).get();
                        if (!q.empty) { teamDoc = q.docs[0]; break; }
                    }
                }

                if (!teamDoc) throw new Error('Team not found');
                const teamData = teamDoc.data()!;

                // Skip if already has passes
                if (teamData.passTokens?.length > 0) {
                    steps.push('hackathon passes already exist — skipped');
                } else {
                    const allMembers = [
                        { ...teamData.leader, isLeader: true },
                        ...(teamData.members || []).map((m: any) => ({ ...m, isLeader: false }))
                    ];
                    const passTokens: any[] = [];
                    for (const member of allMembers) {
                        const token = crypto.randomBytes(12).toString('hex');
                        passTokens.push({ name: member.name, token, isLeader: member.isLeader });
                        await adminDb.collection("hackathon_passes").add({
                            token, teamId: teamDoc.id,
                            teamCollection: teamDoc.ref.parent.id,
                            teamName: teamData.teamName,
                            memberName: member.name, memberRegNo: member.regNo || '',
                            memberEmail: member.email || '', memberPhone: member.phone || '',
                            isLeader: member.isLeader,
                            accommodation: member.accommodation || { mar11: false, mar13: false },
                            collegeName: teamData.collegeName || '',
                            createdAt: new Date().toISOString(), reconciledAt: new Date().toISOString()
                        });
                    }
                    await teamDoc.ref.update({
                        paymentStatus: 'paid', transactionId: transaction.paytmTxnId || orderId, passTokens
                    });
                    steps.push(`hackathon passes generated: ${passTokens.length}`);
                }
            } catch (e: any) {
                errors.push(`hackathon pass failed: ${e.message}`);
            }
        }

        // Mark payment_issues as resolved (if any)
        try {
            const issuesSnap = await adminDb.collection("payment_issues")
                .where("orderId", "==", orderId).where("resolved", "==", false).get();
            for (const d of issuesSnap.docs) {
                await d.ref.update({ resolved: true, resolvedAt: new Date().toISOString(), resolvedBy: 'reconcile_api' });
            }
        } catch (e) { /* non-critical */ }

        return NextResponse.json({
            success: errors.length === 0,
            orderId,
            steps,
            errors,
            message: errors.length === 0
                ? 'Reconciliation complete'
                : `Completed with ${errors.length} error(s) — check steps for details`
        });

    } catch (error: any) {
        console.error("[Reconcile] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

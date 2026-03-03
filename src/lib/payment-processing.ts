import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import crypto from 'crypto';

/**
 * Core pass-generation and user-update logic, broken into granular steps.
 * Each step is independently try/caught so one failure never blocks the others.
 */
export async function processSuccessfulPayment(transaction: any, paytmResponse: any) {
    const { orderId, userId, eventIds = [], teamId, email } = transaction;
    const { TXNID } = paytmResponse;

    console.log(`[Processing][Step 1] Processing success for orderId=${orderId} userId=${userId}`);

    // ── Step 1: Update users/{userId} (CRITICAL — grants dashboard access) ──
    try {
        const nonHackathonEvents = eventIds.filter((id: string) => id !== 'HACKATHON');
        const isHackathonOnly = nonHackathonEvents.length === 0 && eventIds.includes('HACKATHON');
        const isFreefireOnly = orderId && orderId.startsWith('FF-');

        const userUpdateArgs: Record<string, any> = {
            isOnboarded: true,
            completed: true,
            paymentDetails: {
                amount: parseFloat(transaction.amount) || 0,
                currency: "INR",
                orderId: transaction.orderId,
                txnId: TXNID || null,
                paymentDate: new Date().toISOString(),
            }
        };

        if (isFreefireOnly) {
            userUpdateArgs.hasFreefirePass = true;
        } else if (isHackathonOnly) {
            userUpdateArgs.hasHackathonPass = true;
        } else {
            userUpdateArgs.hasEntryPass = true;
        }

        if (eventIds.length > 0) {
            userUpdateArgs.registeredEventIds = admin.firestore.FieldValue.arrayUnion(...eventIds);
        }

        // USE SET WITH MERGE — never throws "document not found"
        await adminDb.collection("users").doc(userId).set(userUpdateArgs, { merge: true });
        console.log(`[Processing][Step 1] ✅ users/${userId} updated — hasEntryPass=${!isHackathonOnly && !isFreefireOnly}`);
    } catch (err) {
        console.error(`[Processing][Step 1] ❌ FAILED to update users/${userId}:`, err);
        // Don't stop — continue to other steps
    }

    // ── Step 2: Update registrations/{userId} (legacy, may not exist — use merge) ──
    try {
        const nonHackathonEvents = eventIds.filter((id: string) => id !== 'HACKATHON');
        const isHackathonOnly = nonHackathonEvents.length === 0 && eventIds.includes('HACKATHON');
        const isFreefireOnly = orderId && orderId.startsWith('FF-');

        if (!isHackathonOnly && !isFreefireOnly) {
            await adminDb.collection("registrations").doc(userId).set(
                { hasEntryPass: true, isOnboarded: true, paymentStatus: 'success', completed: true },
                { merge: true }
            );
            console.log(`[Processing][Step 2] ✅ registrations/${userId} updated`);
        }
    } catch (err) {
        console.error(`[Processing][Step 2] ❌ FAILED to update registrations/${userId}:`, err);
    }

    // ── Step 3: Process each event ──
    for (const eventId of eventIds) {
        try {
            // ── 3A: HACKATHON special handling ──
            if (eventId === 'HACKATHON') {
                await processHackathonPass(transaction, TXNID);
            } else if (orderId?.startsWith('FF-')) {
                // ── 3B: FreeFire Esports handling ──
                await processFreefirePass(userId, TXNID, orderId);
            } else {
                // ── 3C: Standard event handling ──
                await processStandardEvent(userId, eventId, TXNID);
            }
        } catch (err) {
            console.error(`[Processing][Step 3] ❌ FAILED processing eventId=${eventId}:`, err);
        }
    }
}

async function processHackathonPass(transaction: any, TXNID: string) {
    const { teamId, teamCollection, email } = transaction;

    console.log(`[Processing][Hackathon] Finding team teamId=${teamId} email=${email}`);

    let teamDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    // Attempt 1: Direct lookup in known collection
    if (teamId && teamCollection) {
        try {
            const snap = await adminDb.collection(teamCollection).doc(teamId).get();
            if (snap.exists) { teamDoc = snap; console.log(`[Processing][Hackathon] Found in ${teamCollection} by ID`); }
        } catch (e) { console.error('[Processing][Hackathon] Attempt 1 failed', e); }
    }

    // Attempt 2: hackathon_teams by ID
    if (!teamDoc && teamId) {
        try {
            const snap = await adminDb.collection("hackathon_teams").doc(teamId).get();
            if (snap.exists) { teamDoc = snap; console.log(`[Processing][Hackathon] Found in hackathon_teams by ID`); }
        } catch (e) { console.error('[Processing][Hackathon] Attempt 2 failed', e); }
    }

    // Attempt 3: reg_hackathon by ID (legacy)
    if (!teamDoc && teamId) {
        try {
            const snap = await adminDb.collection("reg_hackathon").doc(teamId).get();
            if (snap.exists) { teamDoc = snap; console.log(`[Processing][Hackathon] Found in reg_hackathon by ID`); }
        } catch (e) { console.error('[Processing][Hackathon] Attempt 3 failed', e); }
    }

    // Attempt 4: Fallback by leader email in both collections
    if (!teamDoc && email) {
        for (const col of ['hackathon_teams', 'reg_hackathon']) {
            try {
                const q = await adminDb.collection(col).where("leader.email", "==", email).get();
                if (!q.empty) {
                    teamDoc = q.docs[0];
                    console.log(`[Processing][Hackathon] Found in ${col} by leader email`);
                    break;
                }
            } catch (e) { console.error(`[Processing][Hackathon] Attempt 4 (${col}) failed`, e); }
        }
    }

    if (!teamDoc || !teamDoc.exists) {
        console.error(`[Processing][Hackathon] ❌ Could not find hackathon team. teamId=${teamId} email=${email}`);
        // Store a "pending recovery" flag in the transaction so admin can reconcile
        await adminDb.collection("payment_issues").add({
            type: 'HACKATHON_TEAM_NOT_FOUND',
            teamId: teamId || null,
            email: email || null,
            orderId: transaction.orderId,
            createdAt: new Date().toISOString(),
        });
        return;
    }

    const teamData = teamDoc.data()!;

    // Skip if already processed (idempotency)
    if (teamData.paymentStatus === 'paid' && teamData.passTokens?.length > 0) {
        console.log(`[Processing][Hackathon] Already processed. Skipping.`);
        return;
    }

    // 1. Update payment status
    await teamDoc.ref.update({
        paymentStatus: 'paid',
        transactionId: TXNID || transaction.orderId,
        paidAt: new Date().toISOString(),
    });

    // 2. Generate pass tokens for all members
    const allMembers = [
        { ...teamData.leader, isLeader: true },
        ...(teamData.members || []).map((m: any) => ({ ...m, isLeader: false }))
    ];

    const passTokens: { name: string; token: string; isLeader: boolean }[] = [];

    for (const member of allMembers) {
        const token = crypto.randomBytes(12).toString('hex');
        passTokens.push({ name: member.name, token, isLeader: member.isLeader });

        await adminDb.collection("hackathon_passes").add({
            token,
            teamId: teamDoc.id,
            teamCollection: teamDoc.ref.parent.id,  // Store which collection this came from
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

    // 3. Save tokens to team doc
    await teamDoc.ref.update({ passTokens });
    console.log(`[Processing][Hackathon] ✅ Generated ${passTokens.length} passes for team ${teamData.teamName}`);
}

async function processFreefirePass(userId: string, TXNID: string, orderId: string) {
    const snap = await adminDb.collection("freefire_teams").doc(userId).get();
    if (!snap.exists) {
        console.error(`[Processing][FreeFire] ❌ Team not found for userId=${userId}`);
        return;
    }
    await snap.ref.update({
        paymentStatus: 'success',
        transactionId: TXNID || orderId,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    console.log(`[Processing][FreeFire] ✅ Team updated for userId=${userId}`);
}

async function processStandardEvent(userId: string, eventId: string, TXNID: string) {
    const regQuery = await adminDb.collection("events").doc(eventId)
        .collection("registrations").where("userId", "==", userId).get();

    if (regQuery.empty) {
        console.warn(`[Processing][Standard] No registration found for userId=${userId} eventId=${eventId}`);
        return;
    }

    // Sort in memory to avoid missing FireStore index errors
    const docs = regQuery.docs;
    docs.sort((a, b) => {
        const tA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0;
        const tB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0;
        return tB - tA; // Descending (Newest first)
    });

    const newestDoc = docs[0];
    await newestDoc.ref.update({ paymentStatus: 'success', status: 'active' });

    // We only need to mark the most recent registration as success.
    // Legacy abandoned 'pending' duplicate bugs should NOT be marked.
    console.log(`[Processing][Standard] ✅ Processed eventId=${eventId} for userId=${userId} (updated only 1 of ${docs.length} docs)`);
}

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/api-auth";

/**
 * Admin Utility to reset Welcome Kit or Event Attendance flags.
 * Usage (POST): 
 * { 
 *   "target": "all" | "specific", 
 *   "userId": "...", 
 *   "resetType": "welcome_kit" | "attendance" | "transactions" | "both" | "all_flags"
 * }
 */
export async function POST(req: NextRequest) {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return auth.response;

    try {
        const { target, userId, resetType } = await req.json();

        if (!target || !resetType) {
            return NextResponse.json({ error: "Missing required fields: target, resetType" }, { status: 400 });
        }

        if (target === 'specific' && !userId) {
            return NextResponse.json({ error: "userId required for specific target" }, { status: 400 });
        }

        let usersReset = 0;
        let regsReset = 0;
        let txsReset = 0;

        // 1. Reset Welcome Kit (in 'users' collection)
        if (resetType === 'welcome_kit' || resetType === 'both' || resetType === 'all_flags') {
            if (target === 'specific') {
                await adminDb.collection("users").doc(userId).update({
                    hasReceivedWelcomeKit: false,
                    welcomeKitConfirmedAt: null
                });
                usersReset = 1;
            } else {
                // Bulk reset
                const snapshot = await adminDb.collection("users")
                    .where("hasReceivedWelcomeKit", "==", true)
                    .get();
                
                const chunks = [];
                for (let i = 0; i < snapshot.size; i += 500) {
                    const chunk = snapshot.docs.slice(i, i + 500);
                    const batch = adminDb.batch();
                    chunk.forEach(doc => {
                        batch.update(doc.ref, { 
                            hasReceivedWelcomeKit: false,
                            welcomeKitConfirmedAt: null
                        });
                    });
                    await batch.commit();
                }
                usersReset = snapshot.size;
            }
        }

        // 2. Reset Attendance (in 'events/{id}/registrations' collection)
        if (resetType === 'attendance' || resetType === 'both' || resetType === 'all_flags') {
            const eventsSnapshot = await adminDb.collection("events").get();
            
            for (const eventDoc of eventsSnapshot.docs) {
                const regsRef = eventDoc.ref.collection("registrations");
                let query;
                
                if (target === 'specific') {
                    query = regsRef.where("userId", "==", userId);
                } else {
                    query = regsRef.where("attendance", "==", true);
                }

                const regSnapshot = await query.get();
                if (!regSnapshot.empty) {
                    const chunks = [];
                    for (let i = 0; i < regSnapshot.size; i += 500) {
                        const chunk = regSnapshot.docs.slice(i, i + 500);
                        const batch = adminDb.batch();
                        chunk.forEach(doc => {
                            batch.update(doc.ref, { 
                                attendance: false,
                                rewarded: false,
                                rewardTxHash: null
                            });
                        });
                        await batch.commit();
                    }
                    regsReset += regSnapshot.size;
                }
            }
        }

        // 3. Reset Transaction History (Clear the 'transactions' collection)
        if (resetType === 'transactions' || resetType === 'all_flags') {
            let txQuery;
            if (target === 'specific') {
                txQuery = adminDb.collection("transactions").where("userId", "==", userId);
            } else {
                txQuery = adminDb.collection("transactions");
            }

            const txSnapshot = await txQuery.get();
            if (!txSnapshot.empty) {
                for (let i = 0; i < txSnapshot.size; i += 500) {
                    const chunk = txSnapshot.docs.slice(i, i + 500);
                    const batch = adminDb.batch();
                    chunk.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                }
                txsReset = txSnapshot.size;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Reset complete.`,
            stats: { usersReset, registrationsReset: regsReset, transactionsDeleted: txsReset }
        });

    } catch (error: any) {
        console.error("Reset Utility Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

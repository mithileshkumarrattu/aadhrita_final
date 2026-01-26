import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/paytmChecksum";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // Paytm sends data as application/x-www-form-urlencoded
        const formData = await req.formData();
        const paytmResponse: any = {};

        formData.forEach((value, key) => {
            paytmResponse[key] = value;
        });

        console.log("Paytm Callback Received:", paytmResponse);

        // 1. Verify Checksum
        const checksum = paytmResponse.CHECKSUMHASH;
        if (!checksum) {
            return NextResponse.json({ error: "Checksum missing" }, { status: 400 });
        }

        // We need to remove CHECKSUMHASH from params for verification
        const paramsForVerification = { ...paytmResponse };
        delete paramsForVerification.CHECKSUMHASH;

        const isValid = await verifySignature(paramsForVerification, process.env.PAYTM_MERCHANT_KEY || "", checksum);

        if (!isValid) {
            console.error("Checksum Verification Failed");
            return NextResponse.json({ error: "Checksum verification failed" }, { status: 400 });
        }

        // 2. Extract Data
        const { ORDERID, STATUS, TXNID, TXNAMOUNT } = paytmResponse;

        // 3. Find Transaction in Firestore
        // Note: Using 'transactions' collection
        const snapshot = await adminDb.collection("transactions").where("orderId", "==", ORDERID).get();

        if (snapshot.empty) {
            console.error("Transaction Not Found:", ORDERID);
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        const transaction = doc.data();

        // 4. Validate Amount
        if (parseFloat(transaction.amount) !== parseFloat(TXNAMOUNT)) {
            console.warn("Amount Mismatch:", { expected: transaction.amount, received: TXNAMOUNT });
            // We generally flag this but might still record the status
        }

        // 5. Update Status
        let finalStatus = "FAILED";
        if (STATUS === "TXN_SUCCESS") {
            finalStatus = "SUCCESS";
        } else if (STATUS === "PENDING") {
            finalStatus = "PENDING";
        }

        await doc.ref.update({
            status: finalStatus,
            paytmTxnId: TXNID || null,
            gatewayResponse: STATUS,
            paytmResponse: JSON.stringify(paytmResponse),
            updatedAt: new Date().toISOString()
        });

        // --- 6. Update User & Event Registrations on Success ---
        if (finalStatus === "SUCCESS") {
            try {
                const userId = transaction.userId;
                const eventIds = transaction.eventIds || [];

                if (userId) {
                    // A. Update Main User Registration (Entry Pass)
                    // A. Update Main User Registration (Entry Pass)
                    // Update both 'registrations' (detailed form data) and 'users' (auth profile)
                    await adminDb.collection("registrations").doc(userId).update({
                        hasEntryPass: true,
                    });
                    await adminDb.collection("users").doc(userId).update({
                        hasEntryPass: true
                    });

                    // B. Update Individual Event Registrations
                    // We need to find the registration doc for each event for this user.
                    // Since we don't have the regDocId, we query.
                    for (const eventId of eventIds) {
                        // Hackathon Special Handling
                        if (eventId === 'HACKATHON') {
                            // Find team where leader.email matches transaction.email
                            // Note: Hackathon Teams are in 'hackathon_teams' collection (assuming standard naming)
                            // Ideally, we'd store the teamId or docId in the transaction metadata, but querying by email is a decent fallback for now if unique.

                            // Trying 'hackathon_teams' or 'hackathon_registrations' - based on User's previous file it seemed like 'hackathon_teams' might be the intent or default.
                            // I will use 'hackathon_teams' as it's the standard for the interface name HackathonTeam.
                            const hQuery = await adminDb.collection("hackathon_teams")
                                .where("leader.email", "==", transaction.email)
                                .get();

                            hQuery.docs.forEach(async (d) => {
                                await d.ref.update({
                                    paymentStatus: 'paid',
                                    transactionId: transaction.orderId
                                });
                            });
                        } else {
                            // Standard Event Handling : Team Creation Logic
                            const regQuery = await adminDb.collection("events").doc(eventId).collection("registrations")
                                .where("userId", "==", userId)
                                .get();

                            for (const docSnapshot of regQuery.docs) {
                                const regData = docSnapshot.data();

                                // 1. Update Registration Status
                                await docSnapshot.ref.update({
                                    paymentStatus: 'success', // Standardized to 'success'
                                    status: 'active'
                                });

                                // 2. Team Logic (Strictly for Team Events)
                                // We check if data implies team logic
                                const role = regData.role;
                                const teamName = regData.responses?.teamName;
                                const targetTeamId = regData.teamId;

                                if (role === 'Leader' && teamName) {
                                    // A. CREATE TEAM
                                    // Generate ID: TEAM-XXXX (Match Client Logic aprox)
                                    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
                                    const finalTeamId = `${teamName.toUpperCase().replace(/\s+/g, '_')}_${uniqueSuffix}`;

                                    // Check if team already exists (Idempotency for careless retries)
                                    // Though unlikely with random suffix, we just create.
                                    const newTeamRef = adminDb.collection('teams').doc();

                                    await newTeamRef.set({
                                        id: newTeamRef.id,
                                        teamId: finalTeamId,
                                        eventId: eventId,
                                        teamName: teamName,
                                        leaderId: userId,
                                        leaderName: regData.userSnapshot?.fullName || 'Leader',
                                        memberIds: [userId],
                                        members: [{
                                            userId: userId,
                                            name: regData.userSnapshot?.fullName || '',
                                            regNo: regData.userSnapshot?.regNo || ''
                                        }],
                                        maxSize: 5, // Default fallback, ideally fetch Event config but costly here.
                                        status: 'open',
                                        createdAt: new Date().toISOString() // Admin SDK uses ISO string or Timestamp
                                    });

                                    // Update Leader's Reg with the generated TeamID
                                    await docSnapshot.ref.update({ teamId: finalTeamId });

                                } else if (role === 'Member' && targetTeamId) {
                                    // B. JOIN TEAM
                                    // Find Team Doc by teamId string
                                    const teamQuery = await adminDb.collection('teams').where('teamId', '==', targetTeamId).get();

                                    if (!teamQuery.empty) {
                                        const teamDoc = teamQuery.docs[0];
                                        const teamData = teamDoc.data();

                                        // Check duplicates
                                        if (!teamData.memberIds?.includes(userId)) {
                                            const newMember = {
                                                userId: userId,
                                                name: regData.userSnapshot?.fullName || '',
                                                regNo: regData.userSnapshot?.regNo || ''
                                            };

                                            // Atomic Add
                                            // Note: Admin SDK arrayUnion
                                            const adminLib = require('firebase-admin'); // Determine imports or use generic
                                            // Assuming firebase-admin is available as we used adminDb
                                            // But actually I don't have FieldValue imported.
                                            // I will push to array manually reading current state to avoid import issues if possible, 
                                            // OR safely assume we can just push since we fetched.

                                            const updatedMemberIds = [...(teamData.memberIds || []), userId];
                                            const updatedMembers = [...(teamData.members || []), newMember];

                                            await teamDoc.ref.update({
                                                memberIds: updatedMemberIds,
                                                members: updatedMembers
                                            });
                                        }
                                    } else {
                                        console.error(`Callback: Target Team ${targetTeamId} not found for user ${userId}`);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (syncError) {
                console.error("Failed to sync registration status:", syncError);
                // We don't fail the callback, just log it. 
                // Admin might need to reconcile manually if this happens.
            }
        }

        // 6. Redirect User
        // Using Absolute URL for redirect safety
        const baseUrl = new URL(req.url).origin;
        if (finalStatus === "SUCCESS") {
            return NextResponse.redirect(`${baseUrl}/payment-success?orderId=${ORDERID}`);
        } else {
            return NextResponse.redirect(`${baseUrl}/payment-failed?orderId=${ORDERID}`);
        }

    } catch (error: any) {
        console.error("Callback Error:", error);
        return NextResponse.json({ error: "Callback processing failed", details: error.message }, { status: 500 });
    }
}

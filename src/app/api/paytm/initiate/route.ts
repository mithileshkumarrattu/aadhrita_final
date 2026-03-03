import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/paytmChecksum";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { amount, email, phone, studentName, orderId, userId, eventIds, teamId } = await req.json();

        let calculatedAmount = 0;

        // --- ENFORCE SERVER-SIDE PRICING (Security Fix for ₹1 Exploit) ---
        if (!orderId) {
            return NextResponse.json({ success: false, message: "Missing Order ID", error: "Missing Order ID" }, { status: 400 });
        }

        if (orderId.startsWith('FF-')) {
            // FreeFire is a flat rate of ₹400 per team
            calculatedAmount = 400;
        }
        else if (orderId.startsWith('HACK_')) {
            // Hackathon Finale: Base 600/person + 500/day accommodation
            if (!teamId) return NextResponse.json({ success: false, error: "Missing Team ID" }, { status: 400 });
            const collectionName = req.headers.get('x-team-collection') || 'hackathon_teams';
            const hackDoc = await adminDb.collection(collectionName).doc(teamId).get();
            if (!hackDoc.exists) return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });

            const hData = hackDoc.data()!;
            const hackathonFee = (hData.teamSize || 0) * 600;
            let accomDays = 0;
            const checkAccom = (member: any) => {
                if (member?.accommodation?.mar11) accomDays++;
                if (member?.accommodation?.mar13) accomDays++;
            };
            checkAccom(hData.leader);
            if (Array.isArray(hData.members)) {
                hData.members.forEach(checkAccom);
            }
            calculatedAmount = hackathonFee + (accomDays * 500);
        }
        else if (orderId.startsWith('ORD_')) {
            // Onboarding: Entry Pass + Accommodation + Extra Events
            const userSnap = await adminDb.collection('users').doc(userId).get();
            if (!userSnap.exists) return NextResponse.json({ success: false, error: "User profile not found for onboarding payment" }, { status: 404 });
            const userData = userSnap.data()!;

            // 1. Base Entry Pass Fee
            calculatedAmount += (userData.collegeType === 'MVGR' ? 200 : 300);

            // 2. Accommodation Fee
            if (userData.accommodationRequired && Array.isArray(userData.accommodationDates)) {
                const days = userData.accommodationDates.length;
                const rate = userData.accommodationType === 'without_food' ? 300 : 500;
                calculatedAmount += (1 * days * rate);
            }

            // 3. Paid Events Fee (each attached event is ₹100 during onboarding)
            if (Array.isArray(eventIds) && eventIds.length > 0) {
                // Some events might have different prices, but Onboarding assumes flat ₹100 right now per added event
                calculatedAmount += (eventIds.length * 100);
            }
        }
        else {
            // Standalone Event(s) (e.g. EVT_xxxx combined with existing entry pass)
            if (!Array.isArray(eventIds) || eventIds.length === 0) {
                return NextResponse.json({ success: false, error: "Cannot process standalone event without valid eventIds array" }, { status: 400 });
            }

            // Fetch all requested events to sum their prices securely
            for (const eId of eventIds) {
                const evtSnap = await adminDb.collection('events').doc(eId).get();
                if (evtSnap.exists) {
                    calculatedAmount += (evtSnap.data()?.entryFeeInr || 0);
                } else {
                    return NextResponse.json({ success: false, error: `Invalid Event ID included: ${eId}` }, { status: 404 });
                }
            }
        }

        // Failsafe: Ensure amount is strictly positive
        if (calculatedAmount <= 0) {
            return NextResponse.json({ success: false, error: "Invalid calculated payment amount" }, { status: 400 });
        }

        const validAmount = calculatedAmount.toFixed(2);
        const mid = process.env.PAYTM_MID;

        // --- 1. Construct V1 Payload ---
        const paytmParams: any = {};

        paytmParams.body = {
            "requestType": "Payment",
            "mid": mid,
            "websiteName": process.env.PAYTM_WEBSITE,
            "orderId": orderId,
            "callbackUrl": process.env.PAYTM_CALLBACK_URL && process.env.PAYTM_CALLBACK_URL !== 'http://localhost:3000/api/paytm/callback'
                ? process.env.PAYTM_CALLBACK_URL
                : `${new URL(req.url).origin}/api/paytm/callback`,
            "txnAmount": {
                "value": validAmount,
                "currency": "INR",

            },
            "userInfo": {
                // Using userId as CustId for better tracking
                "custId": userId || email,
                "mobile": phone, // REQUIRED for UPI Intent
                "email": email,
                "firstName": studentName
            },
            "channelId": "WEB",
            "industryTypeId": process.env.PAYTM_INDUSTRY_TYPE_ID || "PrivateEducation",
            "enablePaymentMode": [{ "mode": "UPI" }] // Strict UPI Enforcement
        };

        // --- 2. Generate Checksum ---
        let paytmKey = (process.env.PAYTM_MERCHANT_KEY || "").trim();
        // Remove quotes if accidentally added in Vercel UI
        if (paytmKey.startsWith('"') && paytmKey.endsWith('"')) {
            paytmKey = paytmKey.slice(1, -1);
        }

        if (paytmKey.length === 0) {
            console.error("Paytm Key is missing");
            return NextResponse.json({ error: "Paytm Key is missing" }, { status: 500 });
        }

        // Staging Key Fix: Some staging keys might have hidden chars or need truncation?
        // But here it seems to be missing a char.
        // Let's log length.


        // Force 16 chars for STAGING if key is > 16 (Old logic, maybe useful?)
        if (process.env.PAYTM_WEBSITE === 'WEBSTAGING' && paytmKey.length > 16) {
            paytmKey = paytmKey.substring(0, 16);
        }

        const checksum = await generateSignature(JSON.stringify(paytmParams.body), paytmKey);

        paytmParams.head = {
            "signature": checksum
        };

        // --- 3. Call Paytm S2S to get Token ---
        // UPDATE (Feb 2025): Strict Production Enforcement
        // User reported issues with "Main Domain" using Staging.
        // We rely ONLY on NODE_ENV to determine the gateway.
        let gatewayUrl = "https://securegw.paytm.in";

        if (process.env.NODE_ENV !== "production") {
            gatewayUrl = "https://securegw-stage.paytm.in";
        }

        if (gatewayUrl.endsWith("/")) gatewayUrl = gatewayUrl.slice(0, -1);

        const paytmUrl = `${gatewayUrl}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`;

        const paytmResponse = await fetch(paytmUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paytmParams),
        });

        const paytmData = await paytmResponse.json();

        if (!paytmData.body || paytmData.body.resultInfo.resultStatus !== "S") {
            // Graceful Error Handling
            console.error("Paytm Upstream Error:", paytmData.body);
            return NextResponse.json({
                success: false,
                message: paytmData.body?.resultInfo?.resultMsg || "Payment Gateway is temporarily unavailable",
                paytmCode: paytmData.body?.resultInfo?.resultCode
            }, { status: 200 });
        }

        const txnToken = paytmData.body.txnToken;
        const deepLink = paytmData.body.deepLinkInfo?.deepLink || paytmData.body.txnUrl;

        // --- 4. Save to Firestore — MUST be awaited before returning token ---
        // If this write is fire-and-forget and the callback arrives before it completes,
        // the callback finds no transaction record and silently drops the payment.
        try {
            await adminDb.collection("transactions").add({
                orderId,
                userId: userId || null,
                eventIds: eventIds || [],
                teamId: teamId || null,
                teamCollection: req.headers.get('x-team-collection') || null,
                studentName,
                email,
                phone,
                amount: validAmount,
                status: "PENDING",
                paymentMethod: "PAYTM_UPI",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        } catch (dbErr) {
            console.error("[initiate] Firestore write failed — aborting to prevent orphan payment:", dbErr);
            return NextResponse.json({ error: "Failed to create transaction record. Please try again." }, { status: 500 });
        }

        const responsePayload = {
            success: true,
            txnToken,
            orderId,
            mid,
            amount: validAmount,
            deepLink // Pass it to frontend!
        };


        // --- 5. Return Token to Frontend ---
        return NextResponse.json(responsePayload);

    } catch (error: any) {
        console.error("Initiate API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

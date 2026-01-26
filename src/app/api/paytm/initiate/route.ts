import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/paytmChecksum";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { amount, email, phone, studentName, orderId, userId, eventIds } = await req.json();
        const validAmount = Number(amount).toFixed(2);
        const mid = process.env.PAYTM_MID;

        // --- 1. Construct V1 Payload ---
        const paytmParams: any = {};

        paytmParams.body = {
            "requestType": "Payment",
            "mid": mid,
            "websiteName": process.env.PAYTM_WEBSITE,
            "orderId": orderId,
            // DEBUG: Using Google as callback to test if localhost is banned
            "callbackUrl": process.env.PAYTM_CALLBACK_URL,
            "txnAmount": {
                "value": validAmount,
                "currency": "INR",
            },
            "userInfo": {
                // Using userId as CustId for better tracking
                "custId": userId || email,
                "mobile": phone,
                "email": email,
                "firstName": studentName
            },
            "channelId": "WEB",
            "enablePaymentMode": [{ "mode": "UPI" }]
        };

        // --- 2. Generate Checksum ---
        const checksum = await generateSignature(JSON.stringify(paytmParams.body), process.env.PAYTM_MERCHANT_KEY || "");

        paytmParams.head = {
            "signature": checksum
        };

        // --- DEBUG: Log the Outgoing Request ---
        console.log(">> PAYTM V1 REQUEST:", JSON.stringify(paytmParams, null, 2));

        // --- 3. Call Paytm S2S to get Token ---
        const paytmUrl = `${process.env.PAYTM_GATEWAY_URL}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`;

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

        console.log("Txn Token Generated:", txnToken);

        // --- 4. Save to Firestore ---
        await adminDb.collection("transactions").add({
            orderId,
            userId: userId || null,
            eventIds: eventIds || [],
            studentName,
            email,
            phone,
            amount: validAmount,
            status: "PENDING",
            paymentMethod: "PAYTM_UPI",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const responsePayload = {
            success: true,
            txnToken,
            orderId,
            mid,
            amount: validAmount
        };

        console.log("RETURNING TO FRONTEND:", responsePayload);

        // --- 5. Return Token to Frontend ---
        return NextResponse.json(responsePayload);

    } catch (error: any) {
        console.error("Initiate API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

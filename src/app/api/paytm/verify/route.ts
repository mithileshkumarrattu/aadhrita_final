import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/paytmChecksum";
import { adminDb } from "@/lib/firebase-admin";
import { processSuccessfulPayment } from "@/lib/payment-processing";

/**
 * GET /api/paytm/verify?orderId=XXX
 * 
 * Queries Paytm's Transaction Status API ('v1/getPaymentStatus') to get
 * the authoritative payment status directly from Paytm.
 * 
 * This is the key to reconciliation:
 * - User paid on Paytm's side but did not hit our callback → call this to get status
 * - We can then trigger pass generation even without a callback
 */
export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
        return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    try {
        let paytmKey = (process.env.PAYTM_MERCHANT_KEY || "").trim();
        if (paytmKey.startsWith('"') && paytmKey.endsWith('"')) paytmKey = paytmKey.slice(1, -1);
        if (paytmKey.length > 16) paytmKey = paytmKey.substring(0, 16);

        const mid = process.env.PAYTM_MID || "";

        // Build request body
        const body = {
            mid,
            orderId,
        };

        const checksum = await generateSignature(JSON.stringify(body), paytmKey);

        const requestPayload = {
            body,
            head: { signature: checksum }
        };

        // Determine gateway (production vs staging)
        const isProduction = process.env.NODE_ENV === "production";
        const gatewayUrl = isProduction
            ? "https://securegw.paytm.in"
            : "https://securegw-stage.paytm.in";

        const verifyUrl = `${gatewayUrl}/v3/order/status`;

        console.log(`[Verify] Querying Paytm status for orderId=${orderId}`);

        const response = await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
        });

        const data = await response.json();
        console.log(`[Verify] Paytm response for orderId=${orderId}:`, JSON.stringify(data.body?.resultInfo));

        const resultStatus = data.body?.resultInfo?.resultStatus;
        const txnStatus = data.body?.txnInfo?.txnStatus || data.body?.resultInfo?.resultStatus;
        const txnId = data.body?.txnInfo?.txnId;
        const txnAmount = data.body?.txnInfo?.txnAmount;

        // Map Paytm status to our internal status
        let internalStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' = 'UNKNOWN';
        if (resultStatus === 'TXN_SUCCESS' || txnStatus === 'TXN_SUCCESS') internalStatus = 'SUCCESS';
        else if (resultStatus === 'TXN_FAILURE' || txnStatus === 'TXN_FAILURE') internalStatus = 'FAILED';
        else if (resultStatus === 'PENDING' || txnStatus === 'PENDING') internalStatus = 'PENDING';

        // Update our transaction record in Firestore if status changed
        if (internalStatus !== 'UNKNOWN') {
            const txnSnap = await adminDb.collection("transactions")
                .where("orderId", "==", orderId).get();

            if (!txnSnap.empty) {
                const txnDoc = txnSnap.docs[0];
                const current = txnDoc.data();

                if (current.status !== internalStatus) {
                    await txnDoc.ref.update({
                        status: internalStatus,
                        paytmTxnId: txnId || current.paytmTxnId,
                        verifiedAt: new Date().toISOString(),
                        verifyResponse: JSON.stringify(data.body),
                    });
                    console.log(`[Verify] Updated transaction ${orderId}: ${current.status} → ${internalStatus}`);

                    // CRITICAL FIX: If verify recovers a successful payment, execute full payment processing!
                    if (internalStatus === 'SUCCESS' && current.userId) {
                        try {
                            await processSuccessfulPayment(current, { TXNID: txnId });
                            console.log(`[Verify] ✅ Full payment processing completed for recovered payment ${orderId}`);
                        } catch (err) {
                            console.error("[Verify] Failed to fully process recovered payment:", err);
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            orderId,
            internalStatus,
            txnStatus,
            txnId,
            txnAmount,
            raw: data.body,
        });

    } catch (error: any) {
        console.error("[Verify] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

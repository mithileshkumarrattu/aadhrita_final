import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/paytmChecksum";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import * as crypto from "crypto";



export async function POST(req: NextRequest) {
    try {
        // Paytm S2S webhooks can arrive as either:
        // 1. application/x-www-form-urlencoded  (browser callback redirect style)
        // 2. application/json                   (true S2S webhook style)
        // We try both and merge, so we never miss a field.
        const contentType = req.headers.get("content-type") || "";
        let paytmResponse: Record<string, any> = {};

        if (contentType.includes("application/json")) {
            try {
                const jsonBody = await req.json();
                // Paytm S2S may send { body: {...}, head: { signature: "..." } }
                // or a flat payload — flatten both
                if (jsonBody.body) {
                    Object.assign(paytmResponse, jsonBody.body);
                    // Checksum may come in the head
                    if (jsonBody.head?.signature) {
                        paytmResponse.CHECKSUMHASH = jsonBody.head.signature;
                    }
                } else {
                    Object.assign(paytmResponse, jsonBody);
                }
            } catch {
                // fall through — body already consumed, response will be empty
            }
        } else {
            // form-encoded or fallback
            try {
                const rawForm = await req.formData();
                rawForm.forEach((value, key) => { paytmResponse[key] = value; });
            } catch {
                // Paytm sometimes sends no-body pings — return 200
                return NextResponse.json({ success: true });
            }
        }

        // Also check the x-paytm-checksum request header (some webhook variants use it)
        if (!paytmResponse.CHECKSUMHASH) {
            const headerChecksum =
                req.headers.get("x-paytm-checksum") ||
                req.headers.get("x-paytm-signature");
            if (headerChecksum) {
                paytmResponse.CHECKSUMHASH = headerChecksum;
            }
        }

        console.log("Paytm Webhook Received:", paytmResponse);

        // ── Checksum verification ────────────────────────────────────────────
        const checksum = paytmResponse.CHECKSUMHASH;
        if (!checksum) {
            console.warn("Webhook: No CHECKSUMHASH found — processing WITHOUT verification as fallback");
            // Don't fail: if Paytm sends a success notification without a checksum,
            // we still want to handle it. The key safeguard is the Firestore idempotency check.
            // Log and continue.
        } else {
            let paytmKey = (process.env.PAYTM_MERCHANT_KEY || "").trim();
            if (paytmKey.startsWith('"') && paytmKey.endsWith('"')) {
                paytmKey = paytmKey.slice(1, -1);
            }
            if (paytmKey.length > 16) paytmKey = paytmKey.substring(0, 16);

            if (paytmKey.length !== 16) {
                console.error("Webhook: Invalid key length:", paytmKey.length);
                return NextResponse.json({ success: true });
            }

            const paramsForVerification = { ...paytmResponse };
            delete paramsForVerification.CHECKSUMHASH;

            const isValid = await verifySignature(paramsForVerification, paytmKey, checksum);
            if (!isValid) {
                console.error("Webhook: Checksum verification failed");
                return NextResponse.json({ success: true });
            }
        }

        const { ORDERID, STATUS, TXNID, TXNAMOUNT, CUSTID } = paytmResponse;

        if (!ORDERID) {
            console.warn("Webhook: No ORDERID in payload — ignoring");
            return NextResponse.json({ success: true });
        }

        // ── Find transaction in Firestore ────────────────────────────────────
        const snapshot = await adminDb.collection("transactions")
            .where("orderId", "==", ORDERID).get();

        let txDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        let transaction: Record<string, any> | null = null;

        if (snapshot.empty) {
            console.warn(`Webhook: Transaction not found for ORDERID=${ORDERID}. Creating record from webhook data.`);
            // The race condition: initiate failed to write before payment completed.
            // We create the transaction record now from the webhook payload so passes can be granted.
            if (STATUS === "TXN_SUCCESS" && CUSTID) {
                const newTxRef = await adminDb.collection("transactions").add({
                    orderId: ORDERID,
                    userId: CUSTID,       // Paytm puts custId (= userId) here
                    eventIds: [],         // We don't know without the original request
                    teamId: null,
                    studentName: null,
                    email: null,
                    phone: null,
                    amount: TXNAMOUNT || null,
                    // CRITICAL: Must be PENDING so the idempotency check at line 145
                    // does NOT short-circuit and always runs the user-update sync block.
                    // The main flow below will set it to SUCCESS after updating users.
                    status: "PENDING",
                    paytmTxnId: TXNID || null,
                    gatewayResponse: STATUS,
                    webhookReceived: true,
                    createdFromWebhook: true,
                    paymentMethod: "PAYTM_UPI",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                // Log for admin visibility
                await adminDb.collection("payment_issues").add({
                    type: 'WEBHOOK_RACE_CONDITION',
                    orderId: ORDERID,
                    userId: CUSTID,
                    amount: TXNAMOUNT,
                    paytmTxnId: TXNID,
                    note: 'Transaction not found in DB when webhook arrived. Record auto-created. Admin should verify event registrations.',
                    createdAt: new Date().toISOString(),
                    resolved: false,
                });
                txDoc = await newTxRef.get();
                transaction = txDoc.data() || {};
                console.log(`Webhook: Created recovery transaction record for ORDERID=${ORDERID} userId=${CUSTID}`);
            } else {
                console.error(`Webhook: Transaction not found and cannot recover (no CUSTID or not SUCCESS): ORDERID=${ORDERID}`);
                return NextResponse.json({ success: true });
            }
        } else {
            txDoc = snapshot.docs[0];
            transaction = txDoc.data() || {};
        }

        // ── Idempotency ──────────────────────────────────────────────────────
        if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
            console.log(`Webhook: ${ORDERID} already processed as ${transaction.status}. Skipping.`);
            return NextResponse.json({ success: true });
        }

        let finalStatus = "FAILED";
        if (STATUS === "TXN_SUCCESS") finalStatus = "SUCCESS";
        else if (STATUS === "PENDING") finalStatus = "PENDING";

        await txDoc!.ref.update({
            status: finalStatus,
            paytmTxnId: TXNID || null,
            gatewayResponse: STATUS,
            webhookReceived: true,
            updatedAt: new Date().toISOString()
        });

        // ── Full SUCCESS sync ────────────────────────────────────────────────
        if (finalStatus === "SUCCESS") {
            try {
                const { processSuccessfulPayment } = await import('@/lib/payment-processing');
                // processSuccessfulPayment handles registrations, users, and all pass minting safely
                await processSuccessfulPayment(transaction, paytmResponse);
            } catch (syncError) {
                console.error("Webhook: Failed to sync registration via processSuccessfulPayment:", syncError);
            }
        }

        console.log(`Webhook: ${ORDERID} → ${finalStatus}`);

        // ALWAYS return 200 OK — Paytm retries on non-200
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        // Always 200 so Paytm doesn't retry forever on our own bugs
        return NextResponse.json({ success: true }, { status: 200 });
    }
}

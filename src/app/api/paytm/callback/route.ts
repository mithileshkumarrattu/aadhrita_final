import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/paytmChecksum";
import { adminDb } from "@/lib/firebase-admin";
import { processSuccessfulPayment } from "@/lib/payment-processing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the merchant key exactly as configured — no truncation, no mutation.
 * Throws at call-time if the key is missing or wrong length so the problem
 * surfaces immediately rather than silently degrading signature security.
 */
function getMerchantKey(): string {
    let key = (process.env.PAYTM_MERCHANT_KEY ?? "").trim();

    // Strip surrounding quotes that some env loaders add
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1);
    }

    if (!key) {
        throw new Error("PAYTM_MERCHANT_KEY is not set in environment variables.");
    }

    // Paytm merchant keys are exactly 16 characters.
    // Do NOT truncate — if it's wrong, fail loudly.
    if (key.length !== 16) {
        throw new Error(
            `PAYTM_MERCHANT_KEY has invalid length ${key.length} (expected 16). ` +
            `Check your environment configuration.`
        );
    }

    return key;
}

/**
 * Verifies the payment status directly with Paytm's Transaction Status API.
 * This is the ONLY authoritative source of truth for whether money was received.
 * Never rely solely on the incoming callback body's STATUS field.
 */
async function verifyPaymentWithPaytm(
    orderId: string,
    expectedAmount: string
): Promise<{ verified: boolean; status: string; txnId: string | null; paidAmount: string | null }> {
    const merchantId = process.env.PAYTM_MERCHANT_ID;
    const merchantKey = getMerchantKey();

    if (!merchantId) {
        throw new Error("PAYTM_MERCHANT_ID is not set in environment variables.");
    }

    // Build the request body for Paytm's order status API
    const body = {
        body: { mid: merchantId, orderId },
        head: { signature: "" }, // Paytm's status API also requires a checksum in some versions
    };

    const response = await fetch(
        "https://securegw.paytm.in/v3/order/status",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        throw new Error(`Paytm order status API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const resultInfo = data?.body?.resultInfo;
    const txnList = data?.body?.txnList ?? [];
    const latestTxn = txnList[0] ?? {};

    const paytmStatus: string = resultInfo?.resultStatus ?? "FAILED";
    const paidAmount: string | null = latestTxn.txnAmount ?? null;
    const txnId: string | null = latestTxn.txnId ?? null;

    // Verify status
    const isSuccess = paytmStatus === "TXN_SUCCESS";

    // CRITICAL: Also verify the amount matches what we expected.
    // This prevents V1-style attacks where ₹1 was paid but a full pass is granted.
    if (isSuccess && paidAmount !== null) {
        const paid = parseFloat(paidAmount);
        const expected = parseFloat(expectedAmount);
        if (isNaN(paid) || isNaN(expected) || Math.abs(paid - expected) > 0.01) {
            console.error(
                `[Callback] AMOUNT MISMATCH for orderId=${orderId}: ` +
                `expected=${expectedAmount} paid=${paidAmount}`
            );
            return { verified: false, status: "AMOUNT_MISMATCH", txnId, paidAmount };
        }
    }

    return {
        verified: isSuccess,
        status: paytmStatus,
        txnId,
        paidAmount,
    };
}

// ─── Main Route Handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const baseUrl = new URL(req.url).origin;

    try {
        // ── Step 1: Parse form body ───────────────────────────────────────────
        const formData = await req.formData();
        const paytmResponse: Record<string, string> = {};
        formData.forEach((value, key) => {
            paytmResponse[key] = value as string;
        });

        console.log("[Callback] Received payload keys:", Object.keys(paytmResponse));

        // ── Step 2: Validate CHECKSUMHASH ─────────────────────────────────────
        const checksum = paytmResponse.CHECKSUMHASH;
        if (!checksum) {
            console.error("[Callback] Missing CHECKSUMHASH in payload");
            return new NextResponse(null, { status: 400 });
        }

        // getMerchantKey() throws if the key is misconfigured — caught below.
        const paytmKey = getMerchantKey();

        const paramsForVerification = { ...paytmResponse };
        delete paramsForVerification.CHECKSUMHASH;

        const isValid = await verifySignature(paramsForVerification, paytmKey, checksum);
        if (!isValid) {
            console.error("[Callback] Checksum verification FAILED — possible forgery attempt");
            return new NextResponse(null, { status: 400 });
        }

        // ── Step 3: Extract ORDERID — the only field we trust from the body ───
        // Everything else (STATUS, TXNID, TXNAMOUNT) must be verified server-side.
        const { ORDERID } = paytmResponse;
        if (!ORDERID) {
            console.error("[Callback] Missing ORDERID in verified payload");
            return new NextResponse(null, { status: 400 });
        }

        console.log(`[Callback] Checksum valid for ORDERID=${ORDERID}`);

        // ── Step 4: Look up transaction in Firestore ──────────────────────────
        const snapshot = await adminDb
            .collection("transactions")
            .where("orderId", "==", ORDERID)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.error(`[Callback] Transaction not found for ORDERID=${ORDERID}`);
            await adminDb.collection("payment_issues").add({
                type: "MISSING_TRANSACTION_ON_CALLBACK",
                orderId: ORDERID,
                callbackPayloadKeys: Object.keys(paytmResponse),
                note: "Callback received for an order with no matching transaction record. " +
                    "Manually verify with Paytm dashboard and grant pass if payment confirmed.",
                createdAt: new Date().toISOString(),
                resolved: false,
            });
            return NextResponse.redirect(
                `${baseUrl}/payment-failed?orderId=${ORDERID}&reason=not_found`,
                { status: 303 }
            );
        }

        const txnDoc = snapshot.docs[0];
        const transaction = txnDoc.data() as Record<string, any>;

        // ── Step 5: Idempotency — skip if already processed ──────────────────
        if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
            console.log(`[Callback] Already processed as ${transaction.status} — skipping`);
            const eventIdParam = transaction.eventIds?.[0]
                ? `&eventId=${transaction.eventIds[0]}`
                : "";
            const dest = transaction.status === "SUCCESS" ? "payment-success" : "payment-failed";
            return NextResponse.redirect(
                `${baseUrl}/${dest}?orderId=${ORDERID}${eventIdParam}`,
                { status: 303 }
            );
        }

        // ── Step 6: Server-side payment verification with Paytm ──────────────
        const expectedAmount = transaction.amount as string;
        let verificationResult: Awaited<ReturnType<typeof verifyPaymentWithPaytm>>;

        try {
            verificationResult = await verifyPaymentWithPaytm(ORDERID, expectedAmount);
        } catch (verifyErr: any) {
            console.error("[Callback] Paytm verification API error:", verifyErr.message);
            // Can't determine payment outcome — log for manual review, don't grant pass.
            await adminDb.collection("payment_issues").add({
                type: "PAYTM_VERIFICATION_API_ERROR",
                orderId: ORDERID,
                userId: transaction.userId ?? null,
                error: verifyErr.message,
                note: "Could not reach Paytm status API. Payment outcome unknown. Manual reconciliation required.",
                createdAt: new Date().toISOString(),
                resolved: false,
            });
            return NextResponse.redirect(
                `${baseUrl}/payment-failed?orderId=${ORDERID}&reason=verification_error`,
                { status: 303 }
            );
        }

        const { verified, status: verifiedStatus, txnId, paidAmount } = verificationResult;

        console.log(
            `[Callback] Paytm verification result for ORDERID=${ORDERID}: ` +
            `verified=${verified} status=${verifiedStatus} txnId=${txnId} paidAmount=${paidAmount}`
        );

        // ── Step 7: Handle amount mismatch ────────────────────────────────────
        if (verifiedStatus === "AMOUNT_MISMATCH") {
            await txnDoc.ref.update({
                status: "FAILED",
                failureReason: "AMOUNT_MISMATCH",
                paidAmount: paidAmount ?? null,
                expectedAmount,
                updatedAt: new Date().toISOString(),
            });
            await adminDb.collection("payment_issues").add({
                type: "AMOUNT_MISMATCH",
                orderId: ORDERID,
                userId: transaction.userId ?? null,
                expectedAmount,
                paidAmount: paidAmount ?? null,
                paytmTxnId: txnId ?? null,
                note: "User paid a different amount than expected. Pass NOT granted. Manual review required.",
                createdAt: new Date().toISOString(),
                resolved: false,
            });
            return NextResponse.redirect(
                `${baseUrl}/payment-failed?orderId=${ORDERID}&reason=amount_mismatch`,
                { status: 303 }
            );
        }

        // ── Step 8: Determine final status from verified result ───────────────
        let finalStatus: "SUCCESS" | "PENDING" | "FAILED";
        if (verified && verifiedStatus === "TXN_SUCCESS") {
            finalStatus = "SUCCESS";
        } else if (verifiedStatus === "PENDING") {
            finalStatus = "PENDING";
        } else {
            finalStatus = "FAILED";
        }

        // ── Step 9: Update the transaction record ─────────────────────────────
        await txnDoc.ref.update({
            status: finalStatus,
            paytmTxnId: txnId ?? null,
            gatewayResponse: verifiedStatus,
            verifiedByServer: true,          // flag: this status was server-verified
            paidAmount: paidAmount ?? null,
            updatedAt: new Date().toISOString(),
        });

        // ── Step 10: Post-payment actions ─────────────────────────────────────
        const eventIdParam = transaction.eventIds?.[0]
            ? `&eventId=${transaction.eventIds[0]}`
            : "";

        if (finalStatus === "SUCCESS") {
            // processSuccessfulPayment MUST use `transaction` (Firestore data) for
            // all privilege decisions (which pass to grant, which eventIds to register).
            // It must NOT use `paytmResponse` fields for any privilege decision.
            await processSuccessfulPayment(transaction, {
                paytmTxnId: txnId ?? null,
                verifiedStatus,
                paidAmount: paidAmount ?? null,
            });
            return NextResponse.redirect(
                `${baseUrl}/payment-success?orderId=${ORDERID}${eventIdParam}`,
                { status: 303 }
            );
        }

        if (finalStatus === "PENDING") {
            console.warn(`[Callback] PENDING payment for ORDERID=${ORDERID}`);
            await adminDb.collection("payment_issues").add({
                type: "PENDING_PAYMENT",
                orderId: ORDERID,
                userId: transaction.userId ?? null,
                amount: transaction.amount ?? null,
                eventIds: transaction.eventIds ?? [],
                teamId: transaction.teamId ?? null,
                note: "Payment is in PENDING state. Monitor and reconcile via Paytm dashboard.",
                createdAt: new Date().toISOString(),
                resolved: false,
            });
        } else {
            // FAILED
            console.warn(`[Callback] FAILED payment for ORDERID=${ORDERID}`);
            await adminDb.collection("payment_issues").add({
                type: "FAILED_PAYMENT",
                orderId: ORDERID,
                userId: transaction.userId ?? null,
                amount: transaction.amount ?? null,
                eventIds: transaction.eventIds ?? [],
                teamId: transaction.teamId ?? null,
                paytmStatus: verifiedStatus,
                paytmTxnId: txnId ?? null,
                createdAt: new Date().toISOString(),
                resolved: false,
            });
        }

        return NextResponse.redirect(
            `${baseUrl}/payment-failed?orderId=${ORDERID}${eventIdParam}`,
            { status: 303 }
        );

    } catch (error: any) {
        console.error("[Callback] Unhandled error:", error);
        // Do not return null to the browser (white screen) — properly redirect to failure UI.
        const originUrl = new URL(req.url).origin;
        return NextResponse.redirect(
            `${originUrl}/payment-failed?reason=server_crash`,
            { status: 303 }
        );
    }
}

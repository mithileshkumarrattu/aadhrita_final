import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/paytmChecksum";

export async function GET(req: NextRequest) {
    const key = process.env.PAYTM_MERCHANT_KEY || "";
    console.log("---------------- TEST ROUTE START ----------------");
    console.log("TEST KEY RAW:", key);
    console.log("TEST KEY LENGTH:", key.length); // Should be 16 now!

    try {
        const checksum = await generateSignature(
            JSON.stringify({ test: "123" }),
            key
        );
        console.log("TEST CHECKSUM SUCCESS:", checksum);
        return NextResponse.json({ ok: true, checksum, keyLength: key.length });
    } catch (e: any) {
        console.error("TEST ERROR:", e);
        return NextResponse.json(
            { ok: false, error: String(e), keyUsed: key },
            { status: 500 }
        );
    }
}

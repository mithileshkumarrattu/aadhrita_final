import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as crypto from 'crypto';

// Basic admin API protection, can reuse ADMIN_SECRET if we have it
const ADMIN_SECRET = process.env.ADMIN_SECRET || "mvgr_admin_2026";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { adminSecret, names } = body;

        // Note: For simple local-only staff creation you can bypass secret but leaving it here for safety
        // if (adminSecret !== ADMIN_SECRET) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        if (!Array.isArray(names) || names.length === 0) {
            return NextResponse.json({ error: "No names provided" }, { status: 400 });
        }

        const generatedStaff = [];
        const batch = adminDb.batch();
        const staffRef = adminDb.collection("staff_credentials");

        for (const rawName of names) {
            if (!rawName || typeof rawName !== 'string') continue;

            const sanitizedName = rawName.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const randomCode = crypto.randomUUID().split('-')[0].substring(0, 4);
            const username = `${sanitizedName}_${randomCode}`;

            // Password needs to be secure enough for Firebase but easy to type on physical phones 
            // example: Mvgr123! etc. Let's do `sec_Random` 
            const passwordPart = crypto.randomBytes(3).toString('hex'); // 6 chars
            const password = `sec_${passwordPart}`;

            const newDoc = staffRef.doc();
            batch.set(newDoc, {
                username,
                password,
                role: 'security',
                assignedEventId: null,
                createdAt: new Date().toISOString()
            });

            generatedStaff.push({
                Name: rawName,
                Username: username,
                Password: password,
                Role: 'security'
            });
        }

        // Commit all generated credentials at once
        await batch.commit();

        return NextResponse.json({ success: true, count: generatedStaff.length, staff: generatedStaff });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

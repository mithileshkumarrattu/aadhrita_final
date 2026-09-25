import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';
import path from 'path';
import fs from 'fs';

export async function GET() {
    try {
        const jsonPath = path.join(process.cwd(), 'reverted-ghosts.json');
        const rawJson = fs.readFileSync(jsonPath);
        let dataStr = rawJson.toString('utf16le');
        if (dataStr.charCodeAt(0) !== 0xFEFF) {
            dataStr = rawJson.toString('utf8');
        }
        if (dataStr.charCodeAt(0) === 0xFEFF) dataStr = dataStr.slice(1);
        const data = JSON.parse(dataStr);
        const revertedIds = data.reverted.map((r: any) => r.id);

        let pending = 0;
        let success = 0;
        const missingIds = new Set(revertedIds);

        const eventsSnap = await db.collection('events').get();
        for (const eventDoc of eventsSnap.docs) {
            const regsSnap = await db.collection('events').doc(eventDoc.id).collection('registrations').get();
            for (const regDoc of regsSnap.docs) {
                if (missingIds.has(regDoc.id)) {
                    missingIds.delete(regDoc.id);
                    const d = regDoc.data();
                    if (d.paymentStatus === 'success' || d.paymentStatus === 'paid') {
                        success++;
                    } else if (d.paymentStatus === 'pending') {
                        pending++;
                    }
                }
            }
        }

        return NextResponse.json({ success: true, pending, successCount: success, stillMissing: Array.from(missingIds).length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

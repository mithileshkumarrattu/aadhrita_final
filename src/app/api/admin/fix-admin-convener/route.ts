import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const staffQuery = await adminDb.collection('staff_credentials')
            .where('username', '==', 'ADMIN@CONVENER')
            .get();

        let msg = '';
        if (staffQuery.empty) {
            msg = 'ADMIN@CONVENER not found';
        } else {
            const doc = staffQuery.docs[0];
            await doc.ref.update({ role: 'registrations_viewer' });
            msg = 'Role updated to registrations_viewer for ADMIN@CONVENER';
        }

        return NextResponse.json({ success: true, message: msg });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

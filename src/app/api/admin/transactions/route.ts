import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) return auth.response;

    try {
        const snapshot = await adminDb.collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            success: true,
            transactions
        });
    } catch (error: any) {
        console.error("Failed to fetch transactions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

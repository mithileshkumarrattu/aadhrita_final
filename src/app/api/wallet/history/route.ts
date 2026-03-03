import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'UserId required' }, { status: 400 });
    }

    try {
        const snapshot = await adminDb.collection('transactions')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Timestamp to date string for JSON
            timestamp: doc.data().timestamp?.toDate().toISOString()
        }));

        return NextResponse.json({ success: true, history });

    } catch (error: any) {
        console.error('History fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

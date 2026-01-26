import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'UserId required' }, { status: 400 });
    }

    try {
        // 1. Get User's Wallet Address first (to find incoming txs)
        // Wait, 'transactions' log has 'userId' for outgoing.
        // Incoming might not be logged with 'userId' of receiver if sent by someone else.
        // Ideally we query by 'from' OR 'to' address.
        // But for MVP, let's just query by 'userId' (Outgoing) and maybe add Incoming support if we track it.
        // Actually, let's query the 'transactions' collection for `userId == X`.

        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        const snapshot = await getDocs(q);

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

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET() {
    try {
        const q = query(
            collection(db, 'transactions'),
            orderBy('timestamp', 'desc'),
            limit(100) // Limit to last 100 for now to avoid overload
        );

        const snapshot = await getDocs(q);
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

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export async function GET(request: Request) {
    try {
        // Query users
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                fullName: data.fullName,
                role: data.role || 'student',
                registrationNumber: data.registrationNumber,
                walletAddress: data.walletAddress || null,
                walletCreatedAt: data.walletCreatedAt?.toDate().toISOString() || null,
                // We don't fetch balances here to avoid spamming RPC. 
                // Balances can be fetched on demand or client side component.
            };
        });

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        console.error('Admin wallet fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

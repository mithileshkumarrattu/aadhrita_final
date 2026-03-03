import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'users';

        let users = [];

        if (type === 'staff') {
            const snapshot = await adminDb.collection('staff_credentials')
                .orderBy('createdAt', 'desc')
                .get();

            users = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email || data.username,
                    fullName: data.name || data.fullName || 'Staff Member',
                    role: data.role || 'coordinator',
                    registrationNumber: 'STAFF',
                    walletAddress: data.walletAddress || null,
                    walletCreatedAt: data.walletCreatedAt?.toDate?.().toISOString() || null,
                };
            });
        } else {
            // Default: Users
            const snapshot = await adminDb.collection('users')
                .orderBy('createdAt', 'desc')
                .get();

            users = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email,
                    fullName: data.fullName,
                    role: data.role || 'student',
                    registrationNumber: data.registrationNumber,
                    walletAddress: data.walletAddress || null,
                    walletCreatedAt: data.walletCreatedAt?.toDate?.().toISOString() || null,
                };
            });
        }

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        console.error('Admin wallet fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

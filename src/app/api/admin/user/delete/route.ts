import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const { userId, adminId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        // Optional: Verify adminId is actually an admin if we want strict security here
        // For MVP, we assume the frontend protected this call or we trust the implementation context.

        console.log(`Deleting user ${userId}...`);

        const userRef = doc(db, 'users', userId);

        // Check if user exists first and prevent ADMIN deletion
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data() as any;
            if (userData.role === 'admin') {
                return NextResponse.json({ error: 'Cannot delete an Admin user.' }, { status: 403 });
            }

            // 1. Delete Wallet (Secure Info)
            const walletRef = doc(db, 'wallets', userId);
            await deleteDoc(walletRef);

            // 2. Delete User Profile
            await deleteDoc(userRef);
        } else {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'User and Wallet deleted successfully.'
        });

    } catch (error: any) {
        console.error('Delete User error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

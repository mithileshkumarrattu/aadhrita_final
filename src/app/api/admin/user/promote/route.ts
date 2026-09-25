import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { doc, updateDoc } from 'firebase/firestore';
import { verifyAdminRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) return auth.response;

    try {
        const { userId, action } = await request.json();

        if (!userId || !action) {
            return NextResponse.json({ error: 'UserId and Action required' }, { status: 400 });
        }

        const newRole = action === 'promote' ? 'admin' : 'student';

        console.log(`Updating role for ${userId} to ${newRole}...`);

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            role: newRole
        });

        return NextResponse.json({
            success: true,
            message: `User ${action}d successfully to ${newRole}.`
        });

    } catch (error: any) {
        console.error('Promote User error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

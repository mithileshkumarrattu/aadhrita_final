import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
        }

        // Query the staff_credentials collection securely on the backend
        const credentialsRef = adminDb.collection('staff_credentials');
        const snapshot = await credentialsRef.where('username', '==', username).get();

        if (snapshot.empty) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
        }

        const staffDoc = snapshot.docs[0];
        const staffData = staffDoc.data();

        // Warning: Plan text password check (as built by original devs), 
        // hashing recommended for future updates.
        if (staffData.password !== password) {
            return NextResponse.json({ success: false, error: 'Invalid Credentials' }, { status: 401 });
        }

        // Generate a custom Firebase Auth token containing their staff role
        const customToken = await adminAuth.createCustomToken(staffDoc.id, {
            role: staffData.role,
            isStaff: true
        });

        return NextResponse.json({
            success: true,
            token: customToken,
            session: {
                id: staffDoc.id,
                username: staffData.username,
                role: staffData.role,
                assignedEventId: staffData.assignedEventId,
                isAuthenticated: true
            }
        });

    } catch (error: any) {
        console.error("Staff Login API Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

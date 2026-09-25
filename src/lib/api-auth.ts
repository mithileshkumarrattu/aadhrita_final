/**
 * Server-side API authentication helper.
 * Usage: const authResult = await verifyAdminRequest(request);
 *        if (!authResult.ok) return authResult.response;
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin';

const AUTHORIZED_ADMIN_EMAILS = [
    'rattumethelesh@gmail.com',
    'rattumethelesh@gamil.com',
    'gsnreddy125@gmail.com',
    'sarthakrunthala7@gmail.com',
    'mithileshkumarrattu@gmail.com',
];

export async function verifyAdminRequest(request: Request): Promise<{ ok: true; email: string } | { ok: false; response: Response }> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }

    const idToken = authHeader.substring(7);

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const email = (decoded.email || '').toLowerCase();

        let isAuthorized = AUTHORIZED_ADMIN_EMAILS.includes(email);

        if (!isAuthorized) {
            try {
                const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
                if (userDoc.exists && userDoc.data()?.role === 'admin') {
                    isAuthorized = true;
                }
            } catch (err) {
                console.error("Failed to check admin role in Firestore", err);
            }
        }

        if (!isAuthorized) {
            console.error(`[Admin Auth] Forbidden user access attempt. Extracted Email: '${email}'. Required emails:`, AUTHORIZED_ADMIN_EMAILS);
            return {
                ok: false,
                response: new Response(JSON.stringify({ error: 'Forbidden: Not an authorized admin' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                })
            };
        }

        return { ok: true, email };
    } catch (e: any) {
        console.error(`[Admin Auth] verifyIdToken crashed entirely. Error:`, e);
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }
}
export async function verifyUserRequest(request: Request): Promise<{ ok: true; uid: string; email: string } | { ok: false; response: Response }> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }

    const idToken = authHeader.substring(7);

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return {
            ok: true,
            uid: decoded.uid,
            email: (decoded.email || '').toLowerCase()
        };
    } catch (e: any) {
        console.error(`[User Auth] verifyIdToken crashed. Error:`, e);
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }
}
export async function verifyStaffRequest(request: Request): Promise<{ ok: true; uid: string; email: string } | { ok: false; response: Response }> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }

    const idToken = authHeader.substring(7);

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const email = (decoded.email || '').toLowerCase();
        const uid = decoded.uid;

        // Check if user is in hardcoded admins
        if (AUTHORIZED_ADMIN_EMAILS.includes(email)) {
            return { ok: true, uid, email };
        }

        // Check firestore roles (users or staff_credentials)
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const role = userDoc.data()?.role;
            if (['admin', 'coordinator', 'convener', 'faculty', 'hackathon_coordinator', 'registrations_viewer'].includes(role)) {
                return { ok: true, uid, email };
            }
        }

        const staffDoc = await adminDb.collection('staff_credentials').doc(uid).get();
        if (staffDoc.exists) {
            const role = staffDoc.data()?.role;
            if (['admin', 'coordinator', 'convener', 'hackathon_coordinator', 'registrations_viewer', 'entrypass_viewer', 'onspot_coordinator', 'fyfp_coordinator', 'merchandise'].includes(role)) {
                return { ok: true, uid, email };
            }
        }

        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        };

    } catch (e: any) {
        console.error(`[Staff Auth] verifyIdToken failed.`, e);
        return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }
}

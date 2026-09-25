/**
 * authFetch - A drop-in replacement for fetch() used in admin pages.
 * Automatically retrieves the current user's Firebase ID token
 * and injects it as the Authorization header for every request.
 * 
 * Pass an explicit `token` if you already have one (avoids timing issues on page load).
 * 
 * Usage:
 *   import { authFetch } from '@/lib/auth-fetch';
 *   const res = await authFetch('/api/admin/wallets', { method: 'GET' }, token);
 */

import { auth } from '@/lib/firebase';

export async function authFetch(url: string, options: RequestInit = {}, explicitToken?: string): Promise<Response> {
    let token = explicitToken || '';

    if (!token) {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                token = await currentUser.getIdToken(/* forceRefresh= */ false);
            }
        } catch (e) {
            console.error('[authFetch] Failed to get ID token', e);
        }
    }

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
        ...options,
        headers,
    });
}

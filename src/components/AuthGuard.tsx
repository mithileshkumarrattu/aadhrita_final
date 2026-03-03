'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

// ── Module-level cache ────────────────────────────────────────────────────────
// Keyed by user UID. Stores the result of the Firestore "hasEntryPass" check so
// we NEVER re-hit Firestore on subsequent route navigations for the same user.
// Cleared automatically on sign-out (uid changes to null → new uid gets fresh entry).
const onboardingCache = new Map<string, boolean>();

// ── Public paths (no auth required) ──────────────────────────────────────────
const PUBLIC_PATHS = [
    '/', '/login', '/signup', '/enrollment/hackathon', '/about', '/events',
    '/team', '/schedule', '/entrypass', '/support', '/help', '/pass',
    '/register/hackathon', '/conduct', '/privacy', '/payment-success', '/payment-failed',
    '/scoreboard'
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        p => pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
    );
}

// ── Lightweight fullscreen loader ─────────────────────────────────────────────
// Replaces FullScreenCoinLoader — single CSS spinner, no image, no 3D transforms.
// Much lighter on the GPU; indistinguishable to users at normal loading durations.
function QuickLoader() {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: '#050505', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '16px',
        }}>
            <div style={{
                width: 40, height: 40,
                border: '3px solid rgba(212,175,55,0.2)',
                borderTop: '3px solid #D4AF37',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, userProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // `checking` starts true; set to false once the route check resolves.
    // Starts as false for public paths — they never need the Firestore guard.
    const isPublic = isPublicPath(pathname || '/');
    const [checking, setChecking] = React.useState(!isPublic);

    React.useEffect(() => {
        if (loading) return; // Wait for Firebase auth to initialise

        const currentPath = pathname || '/';
        const pub = isPublicPath(currentPath);

        // ── Unauthenticated ───────────────────────────────────────────────────
        if (!user) {
            if (!pub) router.replace('/');
            setChecking(false);
            return;
        }

        // ── Admin: always pass immediately ───────────────────────────────────
        if (userProfile?.role === 'admin') {
            setChecking(false);
            return;
        }

        // ── Public paths: no check needed ────────────────────────────────────
        if (pub || currentPath === '/team' || currentPath.startsWith('/team/')) {
            setChecking(false);
            return;
        }

        // ── Enrollment routes: allow freely ──────────────────────────────────
        if (currentPath.startsWith('/enrollment')) {
            setChecking(false);
            return;
        }

        // ── Register routes: check onboarding status (cached per UID) ────────
        if (currentPath.startsWith('/register')) {
            const cachedResult = onboardingCache.get(user.uid);

            if (cachedResult !== undefined) {
                // Cache hit — instant decision, no Firestore call
                if (!cachedResult && currentPath !== '/register/hackathon' && !currentPath.includes('/register/onboarding')) {
                    router.replace('/register/onboarding');
                }
                setChecking(false);
                return;
            }

            // Cache miss — one-time Firestore fetch, then cache it
            (async () => {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const { db, COLLECTIONS } = await import('@/lib/db');
                    const snap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
                    const isOnboarded = snap.exists() && snap.data()?.hasEntryPass === true;

                    // Store in cache for every future navigation
                    onboardingCache.set(user.uid, isOnboarded);

                    if (!isOnboarded && currentPath !== '/register/hackathon' && !currentPath.includes('/register/onboarding')) {
                        router.replace('/register/onboarding');
                    }
                } catch (e) {
                    console.error('[AuthGuard] onboarding check failed', e);
                } finally {
                    setChecking(false);
                }
            })();
            return;
        }

        // ── All other authenticated routes: allow ─────────────────────────────
        setChecking(false);
    }, [user, userProfile, loading, pathname]);

    // Show the lightweight loader only while genuinely checking a protected route
    if (loading || (user && checking)) {
        return <QuickLoader />;
    }

    return <>{children}</>;
}

// Allow external code to invalidate the cache on sign-out or after onboarding
export function clearOnboardingCache(uid?: string) {
    if (uid) {
        onboardingCache.delete(uid);
    } else {
        onboardingCache.clear();
    }
}

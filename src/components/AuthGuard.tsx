'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { FullScreenCoinLoader } from '@/components/ui/CoinLoader';

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
    '/scoreboard', '/faculty', '/security', '/hackathon-dashboard', '/dashboard/entrypass'
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        p => pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
    );
}


export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, userProfile, profileLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // `checking` starts true; set to false once the route check resolves.
    // Starts as false for public paths — they never need the Firestore guard.
    const isPublic = isPublicPath(pathname || '/');
    const [checking, setChecking] = React.useState(!isPublic);

    React.useEffect(() => {
        if (loading || profileLoading) return; // Wait for Firebase auth and profile to initialise

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
                if (!cachedResult && currentPath !== '/register/hackathon' && !currentPath.includes('/register/onboarding') && currentPath !== '/dashboard') {
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

                    let isOnboarded = false;
                    if (snap.exists()) {
                        const data = snap.data();
                        isOnboarded = data?.hasEntryPass === true || data?.isOnboarded === true || data?.role === 'admin' || data?.role === 'student';
                    }

                    // Store in cache for every future navigation
                    onboardingCache.set(user.uid, isOnboarded);

                    // Only force onboarding if they actually aren't onboarded logically
                    // We REMOVED the strict override that forced /dashboard users back to /onboarding
                    // because /dashboard has its own "Access Denied" state
                    if (!isOnboarded && currentPath !== '/register/hackathon' && !currentPath.includes('/register/onboarding') && currentPath !== '/dashboard') {
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
    if (loading || profileLoading || (user && checking)) {
        return <FullScreenCoinLoader text="Verifying Portal Access..." />;
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

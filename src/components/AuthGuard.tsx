'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { RoyalGateLoader } from './landing/RoyalGateLoader';
import { FullScreenCoinLoader } from '@/components/ui/CoinLoader';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, userProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [checkingReg, setCheckingReg] = React.useState(true);

    // List of public paths that don't require auth
    // Note: /register paths are "protected" but handled by the Student Logic below
    // Note: /register paths are "protected" but handled by the Student Logic below
    const publicPaths = ['/', '/login', '/signup', '/enrollment/hackathon', '/about', '/events', '/team', '/schedule', '/entrypass'];

    React.useEffect(() => {
        const checkStatus = async () => {
            if (loading) return;

            const currentPath = pathname || '/';

            // Explicitly allow team page
            if (currentPath === '/team' || currentPath.startsWith('/team/')) {
                setCheckingReg(false);
                return;
            }

            const isPublic = publicPaths.some(p => currentPath === p || (p !== '/' && currentPath.startsWith(p + '/')));

            if (!user) {
                // If not logged in and not on a public page, go to Landing
                if (!isPublic) {
                    // Avoid infinite redirect if already on /
                    router.replace('/');
                }
                setCheckingReg(false);
                return;
            }

            // --- AUTHENTICATED USER ---

            // 0. ADMIN BYPASS (Fast Pass)
            if (userProfile?.role === 'admin') {
                setCheckingReg(false);
                return;
            }

            // 1. STUDENT LOGIC (Strict Pre-Fest Mode)

            // If on specific "Banned" routes (dashboard, wallet, etc) -> Redirect
            // Actually, we whitelist /register/* and ban everything else for Students

            const isRegisterRoute = currentPath.startsWith('/register');
            const isEnrollmentRoute = currentPath.startsWith('/enrollment');

            // Allow direct access to enrollment pages without forcing general onboarding
            if (isEnrollmentRoute) {
                setCheckingReg(false);
                return;
            }

            if (isRegisterRoute) {
                // Determine if they are in the RIGHT registration stage
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const { db, COLLECTIONS } = await import('@/lib/db');

                    // We check the specific 'registrations' doc
                    const regRef = doc(db, COLLECTIONS.REGISTRATIONS, user.uid);
                    const regSnap = await getDoc(regRef);
                    const isComplete = regSnap.exists() && regSnap.data()?.completed;

                    if (!isComplete) {
                        // Must be in Onboarding
                        if (!currentPath.includes('/register/onboarding')) {
                            router.replace('/register/onboarding'); // Force them there
                        }
                    } else {
                        // Registration Complete
                        // Should NOT be in Onboarding (confusing)
                        if (currentPath.includes('/register/onboarding')) {
                            router.replace('/dashboard');
                        }
                        // Otherwise they are in /register/success or /register/hackathon etc. -> Allow
                    }
                } catch (e) {
                    console.error("Registration check failed", e);
                }
                setCheckingReg(false);
                return;
            }

            // If Student is attempting to access /dashboard or root / while logged in
            // Redirect them to the Registration Flow
            // console.log("Student accessing non-register route -> Redirecting to flow");

            // DISABLE FORCED ONBOARDING AS PER USER REQUEST
            setCheckingReg(false);
            return;

            /*
            // Check status to know where to send (Onboarding vs Success)
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db, COLLECTIONS } = await import('@/lib/db');

                const regRef = doc(db, COLLECTIONS.REGISTRATIONS, user.uid);
                const regSnap = await getDoc(regRef);
                const isComplete = regSnap.exists() && regSnap.data()?.completed;

                if (isComplete) {
                    router.replace('/enrollment/hackathon/success');
                } else {
                    router.replace('/register/onboarding');
                }
            } catch (e) {
                // Fallback
                router.replace('/register/onboarding');
            }
            */
            // checkingReg stays true until redirect happens or we decide to show loading
        };

        checkStatus();
    }, [user, userProfile, loading, pathname]);

    if (loading || (user && userProfile?.role !== 'admin' && checkingReg)) {
        return <FullScreenCoinLoader />;
    }

    return <>{children}</>;
}

'use client';

import * as React from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    getRedirectResult,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { clearOnboardingCache } from '@/components/AuthGuard';
import { safeStorage } from '@/lib/utils';

export type UserRole = 'student' | 'cr' | 'admin';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    fullName: string;
    registrationNumber: string;
    semester?: number;
    section?: string;
    department?: string;
    branch?: string;
    createdAt?: any;
    photoURL?: string;
    mobileNumber?: string;
    collegeName?: string;
    gender?: string;
    yearOfStudy?: string;
    cityState?: string;
    idCardUrl?: string;
    hasEntryPass?: boolean;
    registeredEventIds?: string[];
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    profileLoading: boolean;  // true until Firestore profile is first fetched
    refreshProfile: () => Promise<void>; // call once after payment to pull updated hasEntryPass
    login: (regNo: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (regNo: string, password: string, fullName: string, role: UserRole) => Promise<void>;
    googleLogin: (redirectPath?: string) => Promise<void>;
    sendMagicLink: (email: string, redirectPath?: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    profileLoading: true,
    refreshProfile: async () => { },
    login: async () => { },
    logout: async () => { },
    register: async () => { },
    googleLogin: async () => { },
    sendMagicLink: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [profileLoading, setProfileLoading] = React.useState(true);
    const router = useRouter();
    // Hold the logged-in user's UID so refreshProfile can re-fetch without capturing stale state
    const currentUidRef = React.useRef<string | null>(null);
    const isLoginFlowRef = React.useRef<boolean>(false);

    // â”€â”€ fetchProfile: one-shot getDoc (no persistent socket) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fetchProfile = React.useCallback(async (firebaseUser: import('firebase/auth').User) => {
        const isAdminEmail = firebaseUser.email === 'rattumethelesh@gmail.com';
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let profile = docSnap.data() as UserProfile;
            if (isAdminEmail && profile.role !== 'admin') {
                profile = { ...profile, role: 'admin' };
                await setDoc(docRef, { role: 'admin' }, { merge: true });
            }
            setUserProfile({ ...profile, uid: firebaseUser.uid });
        } else {
            if (isAdminEmail) {
                const p: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    role: 'admin',
                    fullName: 'Admin User',
                    registrationNumber: 'ADMIN',
                    hasEntryPass: true
                };
                await setDoc(docRef, { ...p, createdAt: serverTimestamp() });
                setUserProfile(p);
            } else {
                setUserProfile(null);
            }
        }
    }, []);

    // â”€â”€ refreshProfile: called by payment-success after confirming payment â”€â”€â”€â”€
    // Only users who just paid trigger a re-fetch — not every logged-in user.
    const refreshProfile = React.useCallback(async () => {
        const uid = currentUidRef.current;
        if (!uid) return;
        try {
            const docSnap = await getDoc(doc(db, 'users', uid));
            if (docSnap.exists()) {
                setUserProfile(prev => ({ ...(prev ?? {}), ...docSnap.data(), uid } as UserProfile));
            }
        } catch (e) {
            console.error('[AuthContext] refreshProfile error:', e);
        }
    }, []);

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            currentUidRef.current = firebaseUser?.uid ?? null;

            if (firebaseUser) {
                setProfileLoading(true);
                try {
                    await fetchProfile(firebaseUser);

                    // Avoid double-routing: only process stored redirects if not in active manual login flow
                    if (!isLoginFlowRef.current) {
                        const storedRedirect = safeStorage.getItem('post_login_redirect');
                        if (storedRedirect) {
                            safeStorage.removeItem('post_login_redirect');
                            router.push(storedRedirect);
                        }
                    }
                } catch (err) {
                    console.error('[AuthContext] fetchProfile error:', err);
                    setUserProfile(null);
                } finally {
                    setProfileLoading(false);
                }
            } else {
                setUserProfile(null);
                setProfileLoading(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchProfile]);

    // Handle redirect result for mobile/iOS Google login
    // On iOS, signInWithRedirect is used — the user returns here after auth.
    // We pick up the result here, create their profile, and route them.
    //
    // IMPORTANT: Only run getRedirectResult() when we actually triggered a redirect.
    // If called during an active signInWithPopup flow it causes Firebase internal error:
    // "INTERNAL ASSERTION FAILED: Pending promise was never set".
    // The localStorage flag 'auth_redirect_pending' is set right before signInWithRedirect()
    // and cleared here after consuming the result.
    // IMPORTANT: Must use localStorage, NOT sessionStorage — iOS Safari resets sessionStorage
    // during cross-domain OAuth redirects, causing the flag to always be missing on return.
    React.useEffect(() => {
        console.log('[Auth] Checking for Google redirect result...');

        getRedirectResult(auth)
            .then(async (result) => {
                if (!result?.user) return; // No redirect result — normal page load
                const user = result.user;
                console.log("[Redirect] Google Sign-In returned:", user.email);

                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    // New user — create Firestore profile
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email!,
                        role: 'student',
                        fullName: user.displayName || 'Student',
                        registrationNumber: 'GOOGLE_USER',
                        semester: 1,
                        section: 'A',
                        department: 'General'
                    };
                    await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                    setUserProfile(newProfile);
                }

                // Ensure wallet exists for EVERY login, not just the first time
                fetch('/api/wallet/create', {
                    method: 'POST',
                    body: JSON.stringify({ userId: user.uid, email: user.email }),
                }).catch(e => console.error("Wallet check/creation failed", e));

                // Wait for a brief moment to allow onAuthStateChanged to pick up the user before routing
                setTimeout(() => {
                    const storedRedirect = safeStorage.getItem('post_login_redirect');

                    if (storedRedirect) {
                        safeStorage.removeItem('post_login_redirect');
                        router.push(storedRedirect);
                        return;
                    }

                    if (docSnap.exists()) {
                        const existingData = docSnap.data();
                        if (existingData.isOnboarded || existingData.hasEntryPass || existingData.role === 'admin') {
                            router.push('/dashboard');
                            return;
                        }
                    }

                    router.push('/register/onboarding');
                }, 500);

            })
            .catch((err) => {
                // Silently ignore if no redirect was in progress
                if (err.code !== 'auth/no-auth-event') {
                    console.error('[Redirect] getRedirectResult error:', err);
                }
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle returning Magic Link (Email Sign-in)
    React.useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = safeStorage.getItem('emailForSignIn');

            if (!email) {
                email = window.prompt('Please provide your email for confirmation');
            }

            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then(async (result) => {
                        safeStorage.removeItem('emailForSignIn');
                        const user = result.user;
                        console.log("Magic Link Login Success:", user.email);

                        const docRef = doc(db, 'users', user.uid);
                        const docSnap = await getDoc(docRef);

                        if (!docSnap.exists()) {
                            const newProfile: UserProfile = {
                                uid: user.uid,
                                email: user.email!,
                                role: 'student',
                                fullName: user.displayName || 'Student',
                                registrationNumber: 'MAGIC_LINK_USER',
                                semester: 1,
                                section: 'A',
                                department: 'General'
                            };
                            await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                            setUserProfile(newProfile);
                        } else {
                            setUserProfile({ ...docSnap.data() as UserProfile, uid: user.uid });
                        }

                        // Ensure wallet exists for EVERY login
                        fetch('/api/wallet/create', {
                            method: 'POST',
                            body: JSON.stringify({ userId: user.uid, email: user.email }),
                        }).catch(e => console.error("Wallet check/creation failed", e));

                        const storedRedirect = safeStorage.getItem('post_login_redirect');
                        if (storedRedirect) {
                            safeStorage.removeItem('post_login_redirect');
                            router.push(storedRedirect);
                        } else {
                            if (docSnap.exists()) {
                                const existingData = docSnap.data();
                                if (existingData.isOnboarded || existingData.hasEntryPass || existingData.role === 'admin') {
                                    router.push('/dashboard');
                                    return;
                                }
                            }
                            router.push('/register/onboarding');
                        }
                    })
                    .catch((error) => {
                        console.error("Error signing in with magic link", error);
                        alert("Invalid or expired sign-in link. Please request a new one.");
                    });
            }
        }
    }, [router]);

    const login = async (regNo: string, password: string) => {
        // Map regNo to email if it's not already an email
        const email = regNo.includes('@')
            ? regNo
            : `${regNo.replace(/\s/g, '').toLowerCase()}@grcampx.firebaseapp.com`;

        console.log("Attempting login with:", email);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);

            // Ensure Wallet Exists (Async, don't await blocking UI)
            fetch('/api/wallet/create', {
                method: 'POST',
                body: JSON.stringify({ userId: cred.user.uid, email: cred.user.email }),
            }).catch(e => console.error("Wallet check failed", e));

            router.push('/dashboard');
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const sendMagicLink = async (email: string, redirectPath?: string) => {
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/`,
                handleCodeInApp: true,
            };

            await sendSignInLinkToEmail(auth, email, actionCodeSettings);

            safeStorage.setItem('emailForSignIn', email);

            if (redirectPath) {
                safeStorage.setItem('post_login_redirect', redirectPath);
            }

            alert("Login link sent! Please check your email inbox (or spam folder) to sign in.");
        } catch (error: any) {
            console.error("Error sending magic link:", error);
            alert(`Failed to send link: ${error.message}`);
            throw error;
        }
    };

    const googleLogin = async (redirectPath?: string) => {
        try {
            console.log("Starting Google Login...");

            // All Firebase auth functions are imported statically at the top of this file.
            // Do NOT use dynamic import() here — any `await` before signInWithPopup
            // breaks the synchronous user-gesture context and causes browsers to
            // block the popup or open duplicate tabs.
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            if (redirectPath) {
                safeStorage.setItem('post_login_redirect', redirectPath);
            }

            // â”€â”€ iOS / iPadOS detection only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // signInWithPopup is blocked on iOS/iPadOS by WebKit's security policy.
            // We use signInWithRedirect for these devices; the result is handled
            // by the getRedirectResult() useEffect already in place.
            // We intentionally DO NOT detect desktop Safari here — the complex
            // regex often misidentifies desktop Chrome/Edge and causes false redirects
            // on non-Apple machines, producing multiple-tab chaos.
            const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            const isIos = /iPad|iPhone|iPod/.test(ua) ||
                (typeof navigator !== 'undefined' &&
                    navigator.platform === 'MacIntel' &&
                    navigator.maxTouchPoints > 1);

            if (isIos) {
                // No await — let the browser redirect immediately with the user's gesture intact
                console.log("[Auth] iOS/iPadOS detected — using signInWithRedirect");
                signInWithRedirect(auth, provider);
                return;
            }

            // â”€â”€ Desktop / Android: use popup synchronously â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // Because there are NO async awaits before this line, the browser
            // retains the user-gesture context and will not block the popup.
            isLoginFlowRef.current = true;
            let user;
            const result = await signInWithPopup(auth, provider);
            user = result.user;
            console.log("Google Login Success via Popup:", user.email);

            // Check if profile exists, if not create it
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email!,
                    role: 'student',
                    fullName: user.displayName || 'Student',
                    registrationNumber: 'GOOGLE_USER',
                    semester: 1,
                    section: 'A',
                    department: 'General'
                };
                await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                setUserProfile(newProfile);
            } else {
                // Ensure profile is set immediately to avoid race conditions with routing
                setUserProfile({ ...docSnap.data() as UserProfile, uid: user.uid });
            }

            // Ensure wallet exists for EVERY login
            fetch('/api/wallet/create', {
                method: 'POST',
                body: JSON.stringify({ userId: user.uid, email: user.email }),
            }).catch(e => console.error("Wallet check/creation failed", e));

            // Proceed with final routing using the stored redirect
            const storedRedirect = safeStorage.getItem('post_login_redirect');
            if (storedRedirect) {
                safeStorage.removeItem('post_login_redirect');
                router.push(storedRedirect);
            } else {
                if (docSnap.exists()) {
                    const existingData = docSnap.data();
                    if (existingData.isOnboarded || existingData.hasEntryPass || existingData.role === 'admin') {
                        router.push('/dashboard');
                        return;
                    }
                }
                router.push('/register/onboarding');
            }

        } catch (error: any) {
            console.error("Google login failed", error);
            // Do NOT auto-trigger signInWithRedirect inside a catch block.
            // Doing so causes a page reload while the popup may still be open,
            // resulting in the duplicate-window race condition the user reported.
            if (error.code === 'auth/internal-error') {
                alert("Google Sign-In Error: Internal Firebase Error. Please ask Admin to enable Google Auth in Firebase Console.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                // User dismissed the popup — silent, no alert needed
                console.log("[Auth] Popup closed by user.");
            } else if (error.code === 'auth/popup-blocked') {
                alert("Your browser blocked the login popup. Please allow popups for this site and try again.");
            } else if (error.code !== 'auth/cancelled-popup-request') {
                alert(`Login Error: ${error.message}`);
            }
            throw error;
        } finally {
            isLoginFlowRef.current = false;
        }
    };

    const register = async (regNo: string, password: string, fullName: string, role: UserRole) => {
        const email = regNo.includes('@')
            ? regNo
            : `${regNo.replace(/\s/g, '').toLowerCase()}@grcampx.firebaseapp.com`;

        console.log("Attempting register with:", email);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const { user } = userCredential;

            // UPPERCASE for consistent lookup
            const safeRegNo = regNo.toUpperCase();

            // Check for pre-existing Admin-created user doc (keyed by RegNo)
            const preExistingDocRef = doc(db, 'users', safeRegNo);
            const preExistingDocSnap = await getDoc(preExistingDocRef);

            let finalProfile = {
                uid: user.uid,
                email,
                role,
                fullName,
                registrationNumber: safeRegNo,
                semester: 1, // Default to 1 if not found
                section: 'A', // Default fallback
                department: 'CSE' // Default fallback
            };

            if (preExistingDocSnap.exists()) {
                const preData = preExistingDocSnap.data();
                console.log("Found pre-existing data for " + safeRegNo, preData);

                // Merge pre-existing data (Semester, Section, Batch, etc.)
                // CRITICAI: We DO NOT overwrite the UID with the old doc ID (which was RegNo)
                finalProfile = {
                    ...finalProfile,
                    ...preData, // This brings in classId, section, branch, etc.
                    uid: user.uid, // Ensure UID matches the new Auth UID
                    role: preData.role || role, // Prefer admin-assigned role if any
                    email // Keep email from auth
                };

                // OPTIONAL: We could delete the old doc, but keeping it might be useful for admin lookups 
                // until we update admin tools to query by field only. 
                // For now, we Leave it to prevent data loss.
            } else {
                console.warn("No pre-existing data found for " + safeRegNo);
            }

            // Create the real User Profile under UID
            await setDoc(doc(db, 'users', user.uid), {
                ...finalProfile,
                createdAt: serverTimestamp(),
            });

            // Set local state immediately for fast feedback
            setUser(user);
            setUserProfile(finalProfile);

            // Create Custodial Wallet (Backend)
            try {
                await fetch('/api/wallet/create', {
                    method: 'POST',
                    body: JSON.stringify({ userId: user.uid, email }),
                });
            } catch (wErr) {
                console.error("Wallet creation init failed", wErr);
            }

            router.push('/dashboard');
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const uid = auth.currentUser?.uid;
            if (uid) clearOnboardingCache(uid);
            await firebaseSignOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, profileLoading, refreshProfile, login, googleLogin, sendMagicLink, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => React.useContext(AuthContext);


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
import { useRouter, usePathname } from 'next/navigation';
import { clearOnboardingCache } from '@/components/AuthGuard';
import { safeStorage } from '@/lib/utils';
import { AUTHORIZED_ADMIN_EMAILS } from '@/lib/constants';

// AUTHORIZED_ADMIN_EMAILS moved to constants.ts

export type UserRole = 'student' | 'admin' | 'faculty' | 'cr';

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
    hasReceivedWelcomeKit?: boolean;
    kitHandoverLoggedBySecurity?: boolean;
    registeredEventIds?: string[];
    regNo?: string;
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
    const pathname = usePathname();
    // Hold the logged-in user's UID so refreshProfile can re-fetch without capturing stale state
    const currentUidRef = React.useRef<string | null>(null);
    const isLoginFlowRef = React.useRef<boolean>(false);

    // ── fetchProfile: one-shot getDoc (no persistent socket) ──────────────────
    const fetchProfile = React.useCallback(async (firebaseUser: import('firebase/auth').User) => {
        const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.includes((firebaseUser.email || '').toLowerCase());

        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let profile = docSnap.data() as UserProfile;
            if (isAdminEmail && profile.role !== 'admin') {
                profile = { ...profile, role: 'admin' };
                await setDoc(docRef, { role: 'admin' }, { merge: true });
            }
            setUserProfile({ 
                ...profile, 
                uid: firebaseUser.uid,
                regNo: profile.regNo || profile.registrationNumber || ''
            });
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

    // ── refreshProfile: called by payment-success after confirming payment ───
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
                        if (storedRedirect && storedRedirect !== '/' && storedRedirect !== pathname) {
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
    }, [fetchProfile, pathname, router]);

    // Handle redirect result for mobile/iOS Google login
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
                    const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.includes((user.email || '').toLowerCase());
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email!,
                        role: isAdminEmail ? 'admin' : 'student',
                        fullName: user.displayName || 'Student',
                        registrationNumber: isAdminEmail ? 'ADMIN' : 'GOOGLE_USER',
                        semester: 1,
                        section: 'A',
                        department: 'General'
                    };
                    if (isAdminEmail) newProfile.hasEntryPass = true;
                    await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                    setUserProfile(newProfile);
                }

                fetch('/api/wallet/create', {
                    method: 'POST',
                    body: JSON.stringify({ userId: user.uid, email: user.email }),
                }).catch(e => console.error("Wallet check/creation failed", e));

                // Wait for a moment to allow onAuthStateChanged to pick up the user before routing
                setTimeout(() => {
                    const storedRedirect = safeStorage.getItem('post_login_redirect');

                    if (storedRedirect && storedRedirect !== '/') {
                        safeStorage.removeItem('post_login_redirect');
                        router.push(storedRedirect);
                        return;
                    }

                    // If already on a public path (like /faculty or /security), don't force redirect to onboarding
                    const isPubPath = pathname?.startsWith('/faculty') || pathname?.startsWith('/security') || pathname === '/' || pathname?.startsWith('/about') || pathname?.startsWith('/events');
                    if (isPubPath) return;

                    if (docSnap.exists()) {
                        const existingData = docSnap.data();
                        if (existingData.isOnboarded || existingData.hasEntryPass || existingData.role === 'admin' || existingData.role === 'student') {
                            router.push('/dashboard');
                            return;
                        }
                    }

                    router.push('/register/onboarding');
                }, 500);

            })
            .catch((err) => {
                if (err.code !== 'auth/no-auth-event') {
                    console.error('[Redirect] getRedirectResult error:', err);
                }
            });
    }, [pathname, router]);

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
                            const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.includes((user.email || '').toLowerCase());
                            const newProfile: UserProfile = {
                                uid: user.uid,
                                email: user.email!,
                                role: isAdminEmail ? 'admin' : 'student',
                                fullName: user.displayName || 'Student',
                                registrationNumber: isAdminEmail ? 'ADMIN' : 'MAGIC_LINK_USER',
                                semester: 1,
                                section: 'A',
                                department: 'General'
                            };
                            if (isAdminEmail) newProfile.hasEntryPass = true;
                            await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                            setUserProfile(newProfile);
                        } else {
                            setUserProfile({ ...docSnap.data() as UserProfile, uid: user.uid });
                        }

                        fetch('/api/wallet/create', {
                            method: 'POST',
                            body: JSON.stringify({ userId: user.uid, email: user.email }),
                        }).catch(e => console.error("Wallet check/creation failed", e));

                        const storedRedirect = safeStorage.getItem('post_login_redirect');
                        if (storedRedirect && storedRedirect !== '/') {
                            safeStorage.removeItem('post_login_redirect');
                            router.push(storedRedirect);
                        } else {
                            if (docSnap.exists()) {
                                const existingData = docSnap.data();
                                if (existingData.isOnboarded || existingData.hasEntryPass || existingData.role === 'admin' || existingData.role === 'student') {
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
        const email = regNo.includes('@')
            ? regNo
            : `${regNo.replace(/\s/g, '').toLowerCase()}@grcampx.firebaseapp.com`;

        console.log("Attempting login with:", email);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
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
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            if (redirectPath) {
                safeStorage.setItem('post_login_redirect', redirectPath);
            }

            const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            const isIos = /iPad|iPhone|iPod/.test(ua) ||
                (typeof navigator !== 'undefined' &&
                    navigator.platform === 'MacIntel' &&
                    navigator.maxTouchPoints > 1);

            if (isIos) {
                console.log("[Auth] iOS/iPadOS detected — using signInWithRedirect");
                signInWithRedirect(auth, provider);
                return;
            }

            isLoginFlowRef.current = true;
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log("Google Login Success via Popup:", user.email);

            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.includes((user.email || '').toLowerCase());
                const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email!,
                    role: isAdminEmail ? 'admin' : 'student',
                    fullName: user.displayName || 'Student',
                    registrationNumber: isAdminEmail ? 'ADMIN' : 'GOOGLE_USER',
                    semester: 1,
                    section: 'A',
                    department: 'General'
                };
                if (isAdminEmail) newProfile.hasEntryPass = true;
                await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                setUserProfile(newProfile);
            } else {
                setUserProfile({ ...docSnap.data() as UserProfile, uid: user.uid });
            }

            fetch('/api/wallet/create', {
                method: 'POST',
                body: JSON.stringify({ userId: user.uid, email: user.email }),
            }).catch(e => console.error("Wallet check/creation failed", e));

            const storedRedirect = safeStorage.getItem('post_login_redirect');
            if (storedRedirect && storedRedirect !== '/') {
                safeStorage.removeItem('post_login_redirect');
                router.push(storedRedirect);
            } else {
                // Same logic as getRedirectResult: check public paths
                const isPubPath = pathname?.startsWith('/faculty') || pathname?.startsWith('/security') || pathname === '/' || pathname?.startsWith('/about');
                if (isPubPath) return;

                if (docSnap.exists()) {
                    const existingData = docSnap.data();
                    if (existingData.isOnboarded || existingData.hasEntryPass || existingData.role === 'admin' || existingData.role === 'student') {
                        router.push('/dashboard');
                        return;
                    }
                }
                router.push('/register/onboarding');
            }

        } catch (error: any) {
            console.error("Google login failed", error);
            if (error.code === 'auth/internal-error') {
                alert("Google Sign-In Error: Internal Firebase Error. Please ask Admin to enable Google Auth in Firebase Console.");
            } else if (error.code === 'auth/popup-closed-by-user') {
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

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const { user } = userCredential;
            const safeRegNo = regNo.toUpperCase();
            const preExistingDocRef = doc(db, 'users', safeRegNo);
            const preExistingDocSnap = await getDoc(preExistingDocRef);

            let finalProfile = {
                uid: user.uid,
                email,
                role,
                fullName,
                registrationNumber: safeRegNo,
                semester: 1,
                section: 'A',
                department: 'CSE'
            };

            if (preExistingDocSnap.exists()) {
                const preData = preExistingDocSnap.data();
                finalProfile = {
                    ...finalProfile,
                    ...preData,
                    uid: user.uid,
                    role: preData.role || role,
                    email
                };
            }

            await setDoc(doc(db, 'users', user.uid), {
                ...finalProfile,
                createdAt: serverTimestamp(),
            });

            setUser(user);
            setUserProfile(finalProfile);

            fetch('/api/wallet/create', {
                method: 'POST',
                body: JSON.stringify({ userId: user.uid, email }),
            }).catch(console.error);

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

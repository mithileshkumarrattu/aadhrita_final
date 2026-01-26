'use client';

import * as React from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

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
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    login: (regNo: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (regNo: string, password: string, fullName: string, role: UserRole) => Promise<void>;
    googleLogin: (redirectPath?: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
    register: async () => { },
    googleLogin: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch user profile from Firestore
                try {
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    // Auto-grant admin for specific email
                    const isAdminEmail = firebaseUser.email === 'rattumethelesh@gmail.com';

                    if (docSnap.exists()) {
                        let profile = docSnap.data() as UserProfile;

                        // Force update if admin email but not admin role
                        if (isAdminEmail && profile.role !== 'admin') {
                            profile = { ...profile, role: 'admin' };
                            await setDoc(docRef, { role: 'admin' }, { merge: true });
                        }

                        setUserProfile(profile);
                    } else {
                        // Create profile if missing text (edge case) or Retry
                        if (isAdminEmail) {
                            const p: UserProfile = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email!,
                                role: 'admin',
                                fullName: 'Admin User',
                                registrationNumber: 'ADMIN',
                            };
                            await setDoc(docRef, { ...p, createdAt: serverTimestamp() });
                            setUserProfile(p);
                        } else {
                            // Retry mechanism to handle registration race condition
                            console.warn("Profile not found immediately, retrying...");
                            await new Promise(r => setTimeout(r, 1000));
                            const retrySnap = await getDoc(docRef);

                            if (retrySnap.exists()) {
                                setUserProfile(retrySnap.data() as UserProfile);
                            } else {
                                console.error('User profile not found after retry. Logging out...');
                                await firebaseSignOut(auth);
                                setUser(null);
                                setUserProfile(null);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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

    const googleLogin = async (redirectPath?: string) => {
        try {
            console.log("Starting Google Login...");
            const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log("Google Login Success:", user.email);

            // Check if profile exists, if not create it
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email!,
                    role: 'student',
                    fullName: user.displayName || 'Student',
                    registrationNumber: 'GOOGLE_USER', // Placeholder, user might need to update this?
                    semester: 1,
                    section: 'A',
                    department: 'General'
                };
                await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                setUserProfile(newProfile);

                // Create Wallet
                fetch('/api/wallet/create', {
                    method: 'POST',
                    body: JSON.stringify({ userId: user.uid, email: user.email }),
                }).catch(e => console.error("Wallet creation failed", e));
            }

            router.push(redirectPath || '/register/onboarding');
        } catch (error: any) {
            console.error("Google login failed", error);
            // Alert user if it's an internal error (config missing)
            if (error.code === 'auth/internal-error') {
                alert("Google Sign-In Error: Internal Firebase Error. Please ask Admin to enable Google Auth in Firebase Console.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                console.log("Popup closed");
            } else {
                alert(`Login Error: ${error.message}`);
            }
            throw error;
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
            await firebaseSignOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, login, googleLogin, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => React.useContext(AuthContext);

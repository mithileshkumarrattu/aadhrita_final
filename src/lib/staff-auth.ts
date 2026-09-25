
import { db, COLLECTIONS, StaffCredential } from './db';
import { auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { safeStorage } from '@/lib/utils';

// --- Auth Types ---
export interface StaffSession {
    id: string;
    username: string;
    role: 'security' | 'coordinator' | 'hackathon_coordinator' | 'entrypass_viewer' | 'registrations_viewer' | 'convener' | 'onspot_coordinator' | 'fyfp_coordinator' | 'merchandise' | 'campus_manager';
    assignedEventId?: string | null;
    isAuthenticated: boolean;
}

// --- Session Management (Simple LocalStorage wrapper for client-side) ---
// Note: In production, consider HTTP-only cookies or more robust state management.
export const STAFF_SESSION_KEY = 'aadhrita_staff_session';

export const getStaffSession = (): StaffSession | null => {
    if (typeof window === 'undefined') return null;
    const sessionStr = safeStorage.getItem(STAFF_SESSION_KEY);
    if (!sessionStr) return null;
    try {
        return JSON.parse(sessionStr);
    } catch (e) {
        return null;
    }
};

export const setStaffSession = (session: StaffSession) => {
    if (typeof window === 'undefined') return;
    safeStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
};

export const clearStaffSession = async () => {
    if (typeof window === 'undefined') return;
    safeStorage.removeItem(STAFF_SESSION_KEY);
    try {
        await signOut(auth);
    } catch (e) {
        console.error("Firebase staff signout ignored", e);
    }
};

// --- Auth Operations ---

export const loginStaff = async (username: string, password: string): Promise<{ success: boolean; session?: StaffSession; error?: string }> => {
    try {
        const response = await fetch('/api/staff/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!data.success) {
            return { success: false, error: data.error };
        }

        // Authenticate the user into Firebase natively using the custom backend token
        await signInWithCustomToken(auth, data.token);

        return { success: true, session: data.session };

    } catch (error: any) {
        console.error("Staff Login Error:", error);
        return { success: false, error: error.message };
    }
};

// --- Admin Management Operations ---

export const getAllStaff = async (): Promise<StaffCredential[]> => {
    const q = query(collection(db, COLLECTIONS.STAFF));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffCredential));
};

export const createStaff = async (staffData: StaffCredential) => {
    // Check if username exists
    const q = query(collection(db, COLLECTIONS.STAFF), where('username', '==', staffData.username));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error("Username already exists");
    }

    return await addDoc(collection(db, COLLECTIONS.STAFF), {
        ...staffData,
        createdAt: serverTimestamp()
    });
};

export const deleteStaff = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.STAFF, id));
};


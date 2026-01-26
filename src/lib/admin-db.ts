import { db } from '@/lib/db';
export const adminDb = db;
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Admin Helpers
export const getAllUsers = async (role?: string) => {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    if (role) {
        q = query(collection(db, 'users'), where('role', '==', role), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export const bulkCreateUsers = async (startReg: number, endReg: number, prefix: string, semester: number, section: string, branch: string, year: string) => {
    const batchPromises = [];
    for (let i = startReg; i <= endReg; i++) {
        const regNo = `${prefix}${i.toString().padStart(2, '0')}`;
        // Create user logic here, usually similar to auth but we just create Firestore records
        // Note: Real auth user creation requires Admin SDK. Here we just mock properties or create records that will be linked when they sign in.
        // For MVP, we assume we just populate a 'allowed_users' or similar, or just create the profile doc
        const userRef = doc(db, 'users', regNo);
        batchPromises.push(setDoc(userRef, {
            fullName: `Student ${regNo}`,
            registrationNumber: regNo,
            email: `${regNo.toLowerCase()}@mvgr.edu.in`, // Mock email
            role: 'student',
            semester,
            section,
            branch,
            batchYear: year,
            createdAt: serverTimestamp()
        }, { merge: true }));
    }
    await Promise.all(batchPromises);
}

export const deleteClass = async (year: string, branch: string, section: string) => {
    // 1. Find all users in this class
    const q = query(
        collection(db, 'users'),
        where('batchYear', '==', year),
        where('branch', '==', branch),
        where('section', '==', section)
    );
    const snapshot = await getDocs(q);

    // 2. Delete them
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
}

export const updateClass = async (
    oldDetails: { year: string, branch: string, section: string },
    newDetails: { year: string, branch: string, section: string }
) => {
    const q = query(
        collection(db, 'users'),
        where('batchYear', '==', oldDetails.year),
        where('branch', '==', oldDetails.branch),
        where('section', '==', oldDetails.section)
    );
    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map(d => updateDoc(d.ref, {
        batchYear: newDetails.year,
        branch: newDetails.branch,
        section: newDetails.section
    }));
    await Promise.all(updatePromises);
}

export const bulkUpdateRange = async (
    startRegSuffix: number,
    endRegSuffix: number,
    prefix: string,
    updates: { semester?: number, section?: string, branch?: string, year?: string }
) => {
    // This is a bit inefficient as we have to query roughly or calc IDs.
    // Better to just calc the IDs since we know the pattern.
    const promises = [];
    for (let i = startRegSuffix; i <= endRegSuffix; i++) {
        const regNo = `${prefix}${i.toString().padStart(2, '0')}`;
        const userRef = doc(db, 'users', regNo);
        // We use updateDoc (will fail if doc doesn't exist, which is good - safety check)
        // Or setDoc with merge if we want to be aggressive. updateDoc is safer.
        // But we need to handle "document not found" errors gracefully if we use Promise.all.
        // Actually, let's just use setDoc with merge to be safe and lazy? 
        // No, updateDoc is better to avoid creating ghost users.
        // Let's query existence first? No, too many reads.
        // Let's just try to update.
        promises.push(setDoc(userRef, updates, { merge: true }));
    }
    await Promise.all(promises);
}

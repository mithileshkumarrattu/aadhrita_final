import { db } from '@/lib/db';
import { collection, query, where, getDocs, doc, setDoc, writeBatch, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserSchema, BulkCreateSchema, type UserProfile, type BulkCreateInput } from '@/lib/schemas/user.schema';
import { z } from 'zod';

export class UserServiceError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'UserServiceError';
    }
}

export const UserService = {
    /**
     * Get all users (filtered by role optionally)
     */
    async getAllUsers(role?: string) {
        // Optimize: Limit fields if needed, but for Admin Table we need details
        try {
            const ref = collection(db, 'users');
            const q = role ? query(ref, where('role', '==', role)) : ref;
            const snap = await getDocs(q);
            return snap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    // Ensure ID is mapped if needed (Zod schema has 'uid' but frontend uses 'id' sometimes)
                    id: d.id,
                    uid: d.id, // Ensure uid matches doc ID
                } as unknown as UserProfile;
            });
        } catch (error) {
            console.error("UserService:getAllUsers", error);
            throw new UserServiceError("Failed to fetch users", "FETCH_ERROR");
        }
    },

    /**
     * Bulk Create Users
     * Validates input with Zod before touching DB
     */
    async bulkCreate(input: BulkCreateInput) {
        // 1. Validate Input
        const validData = BulkCreateSchema.parse(input);

        const batch = writeBatch(db);
        const { prefix, startReg, endReg, branch, section, year, semester } = validData;

        // 2. Generate
        for (let i = startReg; i <= endReg; i++) {
            const suffix = i.toString().padStart(2, '0');
            const regNo = `${prefix}${suffix}`;

            // Construct User Object
            // Note: We don't have email/name yet, so we creating 'Provisioned' accounts
            const userData = {
                uid: regNo, // Use RegNo as UID until they claim it? Or custom ID? better to use RegNo for lookup
                registrationNumber: regNo,
                fullName: `Student ${regNo}`,
                email: `${regNo.toLowerCase()}@mvgr.edu.in`, // Assumption
                branch,
                section,
                batchYear: year,
                currentSemester: semester,
                role: 'student',
                isOnboarded: false,
                createdAt: serverTimestamp()
            };

            // Partial validation since we are mocking some fields like UID
            // In a real flow, we'd use UserSchema.parse(userData) but serverTimestamp causes issues with Zod

            const userRef = doc(db, 'users', regNo);
            batch.set(userRef, userData, { merge: true });
        }

        // 3. Commit
        try {
            await batch.commit();
            return { count: endReg - startReg + 1 };
        } catch (error) {
            console.error("UserService:bulkCreate", error);
            throw new UserServiceError("Bulk create failed", "BATCH_ERROR");
        }
    },

    /**
     * Delete a single user
     */
    async deleteUser(userId: string) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            // TODO: Delete Wallet? (Maybe handled by separate WalletService or Cloud Function trigger)
        } catch (error) {
            throw new UserServiceError("Delete failed", "DELETE_ERROR");
        }
    },

    /**
     * Update Range (e.g. fix wrong section for a batch)
     */
    async updateRange(input: { prefix: string, start: number, end: number, updates: Partial<UserProfile> }) {
        // We iterate and update (Batch limited to 500, so we might need chunking)
        // For simplicity assuming < 500 for now, or multiple batches.
        const batch = writeBatch(db);
        let count = 0;

        for (let i = input.start; i <= input.end; i++) {
            const suffix = i.toString().padStart(2, '0');
            const regNo = `${input.prefix}${suffix}`;
            const ref = doc(db, 'users', regNo);
            batch.update(ref, input.updates);
            count++;
        }

        try {
            await batch.commit();
            return count;
        } catch (error) {
            throw new UserServiceError("Range update failed", "UPDATE_ERROR");
        }
    }
};

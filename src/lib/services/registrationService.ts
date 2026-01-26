import { db, COLLECTIONS, UserRegistration, EventRegistration } from '@/lib/db';
import { doc, getDoc, setDoc, serverTimestamp, collection, runTransaction } from 'firebase/firestore';

export const RegistrationService = {
    // 1. Get User's "Passport" (Universal Profile)
    getUserProfile: async (userId: string): Promise<UserRegistration | null> => {
        const docRef = doc(db, COLLECTIONS.REGISTRATIONS, userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as UserRegistration;
        }
        return null;
    },

    // 2. Check if already registered for an event
    checkEventRegistration: async (userId: string, eventId: string): Promise<EventRegistration | null> => {
        // Check User's Personal Registration Subcollection (Optimized for User View)
        const userRegRef = doc(db, COLLECTIONS.USERS, userId, 'registrations', eventId);
        const snapshot = await getDoc(userRegRef);

        if (snapshot.exists()) {
            return snapshot.data() as EventRegistration;
        }
        return null;
    },

    // 3. Register for an Event (Dual Write Strategy)
    registerForEvent: async (
        userId: string,
        eventId: string,
        formData: any,
        userProfile: UserRegistration,
        paymentId?: string
    ): Promise<string> => {
        const registrationData: EventRegistration = {
            eventId,
            userId,
            paymentStatus: paymentId ? 'success' : 'pending',
            status: 'active',
            userSnapshot: {
                fullName: userProfile.fullName,
                collegeName: userProfile.collegeName,
                mobileNumber: userProfile.mobileNumber,
                email: userProfile.email || '',
            },
            responses: formData,
            createdAt: serverTimestamp()
        };

        // We use a Transaction to ensure both writes happen or neither
        await runTransaction(db, async (transaction) => {
            // Path 1: events/{eventId}/registrations/{userId}
            // This is what the ADMIN/ORGANIZER sees.
            const eventSubCollRef = doc(db, COLLECTIONS.EVENTS || 'events', eventId, 'registrations', userId);

            // Path 2: users/{userId}/registrations/{eventId}
            // This is what the USER sees ("My Tickets")
            const userSubCollRef = doc(db, COLLECTIONS.USERS, userId, 'registrations', eventId);

            transaction.set(eventSubCollRef, registrationData);
            transaction.set(userSubCollRef, registrationData);
        });

        return eventId;
    }
};

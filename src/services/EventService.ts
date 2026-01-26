import { db } from '@/lib/db';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, getDocs, orderBy, query, where, serverTimestamp } from 'firebase/firestore';
import { EventSchema, type EventInput } from '@/lib/schemas/event.schema';
import { sanitizeFirestore } from '@/lib/utils';

export class EventServiceError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'EventServiceError';
    }
}

export const EventService = {
    /**
     * Create a new Event with Validation & Sanitization
     */
    async createEvent(input: EventInput) {
        // 1. Validate
        const validData = EventSchema.parse(input);

        // 2. Prepare for DB (Sanitize undefineds)
        const { createdAt, ...rest } = validData;
        const cleanData = sanitizeFirestore(rest);

        // 3. Generate Slug (ID)
        let slug = cleanData.title
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        // Basic check for uniqueness (simple append if exists)
        // In a high-volume app we'd do a loop, but here a simple check is fine.
        const docRef = doc(db, 'events', slug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        try {
            await setDoc(doc(db, 'events', slug), {
                ...cleanData,
                createdAt: serverTimestamp()
            });
            return slug;
        } catch (error) {
            console.error("EventService:createEvent", error);
            throw new EventServiceError("Failed to create event", "CREATE_ERROR");
        }
    },

    /**
     * Get All Events (sorted by created desc)
     */
    async getAllEvents() {
        try {
            const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ ...d.data(), id: d.id } as EventInput));
        } catch (error) {
            throw new EventServiceError("Failed to fetch events", "FETCH_ERROR");
        }
    },

    /**
     * Get Single Event
     */
    async getEventById(id: string) {
        try {
            const snap = await getDoc(doc(db, 'events', id));
            if (!snap.exists()) return null;
            return { ...snap.data(), id: snap.id } as EventInput;
        } catch (error) {
            throw new EventServiceError("Failed to fetch event", "FETCH_ERROR");
        }
    },

    /**
     * Delete Event
     */
    async deleteEvent(id: string) {
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (error) {
            throw new EventServiceError("Failed to delete event", "DELETE_ERROR");
        }
    }
};

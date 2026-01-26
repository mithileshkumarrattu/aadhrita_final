import { db, COLLECTIONS, Event } from '@/lib/db';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { EVENTS_DATA } from '@/lib/constants'; // Fallback for now

export const EventService = {
    // Get single event by ID
    getEventById: async (eventId: string): Promise<Event | null> => {
        try {
            // First try Firestore
            const docRef = doc(db, COLLECTIONS.EVENTS || 'events', eventId);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                return { id: snapshot.id, ...snapshot.data() } as Event;
            }

            // Fallback to Constants if not in DB (Hybrid approach for transition)
            const constantEvent = EVENTS_DATA.find(e => e.id === eventId);
            if (constantEvent) return constantEvent as Event;

            return null;
        } catch (error) {
            console.error("Error fetching event:", error);
            return null;
        }
    },

    // Get all open events
    getAllEvents: async (): Promise<Event[]> => {
        // Logic to fetch all events
        const q = query(collection(db, COLLECTIONS.EVENTS || 'events'));
        const snapshot = await getDocs(q);
        const dbEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

        // Merge with constants? Or prefer DB. Let's return DB + Constants (deduplicated)
        // For simple implementation, let's just use DB if available, else Constants.
        if (dbEvents.length > 0) return dbEvents;
        return EVENTS_DATA as Event[];
    }
};

import {
    collection,
    collectionGroup,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    limit,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserRole } from '@/contexts/AuthContext';
export { db }; // Re-export db for use in pages

// --- Interfaces ---

export interface UserRegistration {
    userId: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    gender: string;
    collegeName: string;
    degreeBranch: string;
    yearOfStudy: string;
    cityState: string;
    idCardUrl: string;
    accommodationRequired: boolean;
    arrivalDate?: string;
    departureDate?: string;
    numberOfDays?: number;
    numberOfBoys?: number;
    numberOfGirls?: number;
    registrationType?: 'Individual' | 'Team';
    accommodationDates?: string[]; // ['25-02-2026', ...]

    // Phase 2: Registration Economy Fields
    collegeType: 'MVGR' | 'OTHER';
    regNo: string; // Mandatory for all
    photoUrl: string; // For Leaderboard
    hasEntryPass: boolean;
    hasHackathonPass: boolean;
    paidEventIds: string[]; // List of registered paid events
    aftCoins: number; // Wallet Balance

    categories: string[]; // ['Technical', 'Cultural', 'Sports']
    completed: boolean;
    createdAt: any;
    // ... (UserRegistration)
}

export interface HackathonTeam {
    id?: string;
    teamName: string;
    teamSize: number; // 3 or 4
    collegeName: string;
    collegeCity: string;
    collegeState: string;
    leader: {
        name: string;
        regNo: string;
        dept: string;
        year: string;
        email: string;
        phone: string;
        idCardUrl: string;
    };
    members: {
        name: string;
        regNo: string;
        dept: string;
        year: string;
        email: string;
        phone: string;
        idCardUrl: string;
    }[];
    pptUrl: string;
    pptTitle: string;
    agreedToRules: boolean;
    declaredOriginality: boolean;
    previousParticipation: boolean;
    communicationChannel: string;
    emergencyContact: string;
    referralSource: string;
    status: 'pending' | 'approved' | 'rejected';
    paymentStatus?: 'pending' | 'paid' | 'failed';
    transactionId?: string;
    createdAt: any;
}

export interface TeamMember {
    id?: string;
    name: string;
    role: string; // e.g., 'Secretary', 'Oraginzer'
    category: string; // Allow custom strings like "Chief Patron"
    designation?: string; // e.g. "Dean (ES)", "Head of Dept" - distinct from 'role' if needed
    imageUrl?: string;
    phone?: string;
    order?: number; // For sorting
}

// -- Shared Types for Event Logic --

export interface TeamMemberInput {
    name: string;
    regNo: string;
    phone: string;
    idCardUrl?: string;
    isVerified?: boolean;
    verificationError?: string | null;
}

export interface EventResponseData {
    isTeamLeader: boolean; // If true, fills members. If false, just Team Name/ID.
    teamName: string;
    teamId?: string; // For joining members
    teamMembers: TeamMemberInput[]; // For Leader only (Deprecated in logic but kept for type safety if needed temporarily)
    customResponses: Record<string, any>; // Dynamic Answers (and teamName/pptUrl fallback)
}

export interface FormFieldConfig {
    id: string; // key for storage e.g. 'theme'
    label: string;
    type: 'text' | 'file' | 'select' | 'textarea' | 'number' | 'checkbox' | 'info';
    options?: string[]; // For select
    required: boolean;
    placeholder?: string;
}

export interface EventFormConfig {
    askTeamName: boolean;
    askPptUrl: boolean;
    askSoundReqs?: boolean; // For Cultural
    askRobotSpecs?: boolean; // For Robowars
    minTeamSize?: number;
    maxTeamSize?: number;
    customFields?: FormFieldConfig[];
}

export interface Event {
    id?: string;
    title: string;
    description: string;
    category: 'Flagship' | 'Tech Frontier' | 'Skill Forge' | 'Brainwave' | 'Cultural' | 'Sports' | 'Spot';
    imagePosterUrl: string;

    // Status
    registrationStatus: 'open' | 'closed' | 'coming_soon';

    // Rules & Constraints
    minTeamSize: number;
    maxTeamSize: number;
    entryFeeAft: number; // Cost in Aadhrita Coins
    entryFeeInr: number; // Cost in INR (for Passes usually, but events can have direct fees)
    rewardAft?: number; // Automatic AFT reward on registration

    // Dynamic Form Configuration
    formConfig: EventFormConfig;

    // Administration & Resources
    coordinators?: string[];     // Emails for custom access
    pptUrl?: string; // Optional: To provide a sample/template
    rulebookUrl?: string; // Optional: Link to rulebook
    schedule?: string;
    venue?: string;

    createdAt: any;
}

export interface Team {
    id?: string; // Auto-generated or custom e.g. "TITANS-2026"
    teamId: string; // The user-facing ID (e.g. "TITANS-2026")
    eventId: string;
    teamName: string;
    leaderId: string;
    leaderName: string; // Cached for display
    memberIds: string[]; // List of User UIDs
    members: { userId: string, name: string, regNo: string }[]; // Cached details
    maxSize: number;
    status: 'open' | 'full' | 'locked';
    createdAt: any;
}

export interface EventRegistration {
    id?: string;
    eventId: string;
    userId: string;
    paymentStatus: 'pending' | 'success' | 'failed' | 'free';
    paymentId?: string;
    orderId?: string; // Razorpay Order ID
    status: 'active' | 'cancelled';

    // Team Data (If applicable)
    teamId?: string;
    role?: 'Leader' | 'Member';
    teamMembers?: any[]; // Legacy or cached members list

    // Snapshot of User Data
    userSnapshot: {
        fullName: string;
        collegeName: string;
        mobileNumber: string;
        email: string;
        [key: string]: any; // Allow flexible fields like yearOfStudy
    };

    // Dynamic Responses
    responses: {
        teamName?: string; // Fallback for legacy or untracked
        pptUrl?: string;
        [key: string]: any; // Dynamic form custom fields
    };

    createdAt: any;
}

export interface Club {
    id?: string;
    name: string;
    description: string;
    logoUrl?: string;
    membersCount: number;
}

export interface CalendarEvent {
    id?: string;
    title: string;
    start?: Date;
    end?: Date;
    date?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    description?: string;
    location?: string;
    audience?: 'class' | 'global';
    type?: 'event' | 'academic' | 'holiday' | 'exam' | 'deadline';
}

export const COLLECTIONS = {
    USERS: 'users',
    REGISTRATIONS: 'registrations', // Extra details
    HACKATHON: 'hackathon_teams',
    WALLETS: 'wallets',
    NOTIFICATIONS: 'notifications',
    NOTES: 'notes',
    CLASSES: 'classes',
    EVENTS: 'events',
    CLUBS: 'clubs',
    EVENT_REGISTRATIONS: 'event_registrations', // The new specific event registrations
    ORDER_HISTORY: 'order_history'
};

// --- User Services ---

export const createUser = async (userData: UserProfile) => {
    await setDoc(doc(db, 'users', userData.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: 'user' as UserRole
    }, { merge: true });
};

// --- Event Services ---

export const getEvents = async (month?: string, context?: string): Promise<Event[]> => {
    // Basic implementation: just fetching all events for now as filtering logic wasn't fully restored
    // In a real app, I'd apply where() clauses based on month/context
    const q = query(collection(db, COLLECTIONS.EVENTS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
};

export const addEvent = async (event: any) => {
    return await addDoc(collection(db, COLLECTIONS.EVENTS), {
        ...event,
        createdAt: serverTimestamp()
    });
};

// Update to use Collection Group Query to fetch nested event registrations
export const getUserEventRegistrations = async (userId: string) => {
    // Queries all 'registrations' collections (root and nested under events)
    // We filter by userId. 
    // Note: This requires a Firestore Index (registrations: userId ASC, createdAt DESC).
    // If index is missing, it will error in console with a link to create it.
    const q = query(
        collectionGroup(db, 'registrations'),
        where('userId', '==', userId),
        // orderBy('createdAt', 'desc') // Commenting out orderBy temporarily to avoid Index Lockout for user
    );
    const querySnapshot = await getDocs(q);

    // Filter client-side to remove the main "Entry Pass" registration if it shares the collection name
    // Entry Pass is in root 'registrations', Events are in 'events/{id}/registrations'
    // Both act as registrations. But we might want to distinguish.
    // The main entry pass likely doesn't have an 'eventId' field in the same way or shares the same schema.
    // If we want ONLY My Events card to show specific events:
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(reg => reg.eventId && reg.eventId !== 'ENTRY_PASS'); // Basic filtering
};

// --- Notification Services ---

export const sendNotification = async (notification: any) => {
    return await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
        ...notification,
        createdAt: serverTimestamp(),
        readBy: []
    });
};

export const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id));
};

export const getNotifications = async (userId?: string) => {
    // In a real app, you might filter by user or get global notifications
    const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUnreadNotificationsCount = async (userId: string) => {
    // Simplified: Just returning a mock or simple count for now given no 'read' status in schema usually
    // Assuming 'readBy' array or similar. For now, returning 0 to fix build.
    return 0;
};

// --- Club Services ---

export const getClubs = async () => {
    const q = query(collection(db, COLLECTIONS.CLUBS));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createClub = async (clubData: any) => {
    return await addDoc(collection(db, COLLECTIONS.CLUBS), {
        ...clubData,
        createdAt: serverTimestamp(),
        membersCount: 0
    });
};

export const getClubById = async (id: string) => {
    const docRef = doc(db, COLLECTIONS.CLUBS, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const joinClub = async (clubId: string, userId: string) => {
    await addDoc(collection(db, COLLECTIONS.CLUBS, clubId, 'members'), {
        userId,
        joinedAt: serverTimestamp()
    });
};

export const leaveClub = async (clubId: string, userId: string) => {
    // This is tricky without Doc ID, finding query
    const q = query(collection(db, COLLECTIONS.CLUBS, clubId, 'members'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.forEach(async (d) => await deleteDoc(d.ref));
};

export const getUserClubIds = async (userId: string) => {
    try {
        const q = query(collectionGroup(db, 'members'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        // The parent of the 'members' doc is the 'members' collection, and its parent is the club doc.
        // However, collectionGroup returns docs from all 'members' collections.
        // We can get the club ID from the doc ref path: clubs/{clubId}/members/{memberDocId}
        return snapshot.docs.map(d => d.ref.parent.parent?.id).filter(id => id !== undefined) as string[];
    } catch (e) {
        console.error("Error fetching user clubs:", e);
        return [];
    }
};

export const checkClubMembership = async (clubId: string, userId: string) => {
    const q = query(collection(db, COLLECTIONS.CLUBS, clubId, 'members'), where('userId', '==', userId));
    const snap = await getDocs(q);
    // checkClubMembership is a helper for future club features
    return !snap.empty;
};


// --- Notes Services ---

export const getNotes = async (userId?: string) => {
    let q;
    if (userId) {
        q = query(collection(db, COLLECTIONS.NOTES), where('userId', '==', userId));
    } else {
        q = query(collection(db, COLLECTIONS.NOTES), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteEvent = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.EVENTS, id));
};

export const addNote = async (note: any) => {
    return await addDoc(collection(db, COLLECTIONS.NOTES), {
        ...note,
        createdAt: serverTimestamp()
    });
};

export const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.NOTES, id));
};

// --- Chat Services ---
export const getMessagesQuery = (channel: string) => {
    return query(collection(db, 'messages', channel, 'chats'), orderBy('createdAt', 'asc'), limit(100));
};

export const sendMessage = async (channel: string, message: any) => {
    await addDoc(collection(db, 'messages', channel, 'chats'), {
        ...message,
        createdAt: serverTimestamp()
    });
};

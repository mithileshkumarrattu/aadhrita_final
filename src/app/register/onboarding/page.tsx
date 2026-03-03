'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, serverTimestamp, addDoc, collectionGroup } from 'firebase/firestore';
import { db, COLLECTIONS, UserRegistration, Event, EventFormConfig, EventResponseData } from '@/lib/db';
import { isTeamNameAvailable, verifyTeamId } from '@/lib/team-logic'; // Import logic
import { uploadFile } from '@/lib/storage';
import { safeStorage } from '@/lib/utils';
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UploadCloud, ArrowLeft, ArrowRight, AlertCircle, Sparkles, Building2, UserCircle2, MapPin, Users, HelpCircle, ChevronRight, CheckCircle, Calendar, Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Cinzel } from 'next/font/google';
import { EventRegistrationCard } from '@/components/events/EventRegistrationCard';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { useCategories } from '@/hooks/use-categories';

const cinzel = Cinzel({ subsets: ['latin'] });

// Constants
const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

// Helper Interfaces for Local State
interface TeamMemberInput {
    name: string;
    regNo: string;
    phone: string;
    isVerified?: boolean;
    verificationError?: string | null;
}

export default function OnboardingPage() {
    const { categories } = useCategories();
    const router = useRouter();
    const { user, userProfile, loading: authLoading } = useAuth();

    // Core State
    const [loading, setLoading] = React.useState(false);
    const [pageLoading, setPageLoading] = React.useState(true);
    const [availableEvents, setAvailableEvents] = React.useState<Event[]>([]);
    const [hasPass, setHasPass] = React.useState(false);

    // File Upload State
    const [uploading, setUploading] = React.useState<string | null>(null);
    const photoInputRef = React.useRef<HTMLInputElement>(null);
    const idInputRef = React.useRef<HTMLInputElement>(null);
    // Native Camera Inputs (using capture attribute - opens native camera app)
    const photoCameraRef = React.useRef<HTMLInputElement>(null);
    const idCameraRef = React.useRef<HTMLInputElement>(null);


    // Form Data - Main Profile
    const [formData, setFormData] = React.useState<Partial<UserRegistration>>({
        fullName: '', mobileNumber: '', email: '', gender: '', photoUrl: '',
        collegeType: 'OTHER', regNo: '', collegeName: '', degreeBranch: '', yearOfStudy: '', cityState: '', idCardUrl: '',
        accommodationRequired: false, arrivalDate: '', departureDate: '', numberOfDays: 0,
        accommodationDates: [], // Initialize to avoid undefined
        paidEventIds: [], aftCoins: 0, registrationType: 'Individual', completed: false
    });

    const [city, setCity] = React.useState('');
    const [state, setState] = React.useState('');
    const [existingEventIds, setExistingEventIds] = React.useState<string[]>([]);

    // --- Dynamic Event Data State ---
    const [eventResponses, setEventResponses] = React.useState<Record<string, EventResponseData>>({});
    // --- Agreements State ---
    const [agreements, setAgreements] = React.useState<Record<string, boolean>>({});

    // -- Derived State for Navigation -- 
    // We check if any selected event is "Complex" (Needs details)
    const selectedEventsDetails = React.useMemo(() => {
        if (!formData.paidEventIds) return [];
        return availableEvents.filter(e => formData.paidEventIds?.includes(e.id!));
    }, [formData.paidEventIds, availableEvents]);

    const complexEvents = React.useMemo(() => {
        return selectedEventsDetails.filter(e =>
            (e.maxTeamSize > 1) || // Team Event (Fixed: Check Max for optional teams)
            (e.formConfig && Object.values(e.formConfig).some(v => !!v)) // Has Config
        );
    }, [selectedEventsDetails]);

    const hasComplexEvents = complexEvents.length > 0;

    // Steps Configuration... (same)
    const STEPS = React.useMemo(() => {
        const base = ['Identity & Stay', 'Events'];
        if (hasComplexEvents) base.push('Event Details');
        base.push('Payment');
        return base;
    }, [hasComplexEvents]);

    const [currentStep, setCurrentStep] = React.useState(1);

    // ----------------------------------------------------------------

    // Effects
    React.useEffect(() => {
        if (city || state) setFormData(prev => ({ ...prev, cityState: `${city}, ${state}` }));
    }, [city, state]);

    React.useEffect(() => {
        const init = async () => {
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    email: user.email || '',
                    fullName: userProfile?.fullName || user.displayName || '',
                    photoUrl: userProfile?.photoURL || user.photoURL || '',
                }));

                // IMMEDIATE CHECK: If User Profile already has pass, block access immediately.
                if (userProfile?.hasEntryPass) {
                    console.log("Entry Pass detected in User Profile. Blocking form.");
                    setHasPass(true);
                }

                setFormData(prev => ({
                    ...prev,
                    email: user.email || '',
                    fullName: userProfile?.fullName || user.displayName || '',
                    photoUrl: userProfile?.photoURL || user.photoURL || '',
                }));

                try {
                    // CONSOLIDATION STEP: Prefer reading from 'users' profile if available
                    if (userProfile?.hasEntryPass) {
                        setHasPass(true);
                        // If we have profile data, use it to pre-fill
                        setFormData(prev => ({
                            ...prev,
                            email: userProfile.email,
                            fullName: userProfile.fullName,
                            photoUrl: userProfile.photoURL,
                            mobileNumber: userProfile.mobileNumber,
                            collegeName: userProfile.collegeName,
                            regNo: userProfile.registrationNumber,
                            gender: userProfile.gender,
                            yearOfStudy: userProfile.yearOfStudy,
                            // CRITICAL FIX: Only pre-fill ID Card if the user actually has an entry pass (completed profile)
                            // Otherwise force it empty to avoid showing stale/wrong images to new users
                            idCardUrl: userProfile.hasEntryPass ? userProfile.idCardUrl : ''
                        }));
                    }

                    // Fallback / Legacy: Check 'registrations' collection if not found in profile
                    const docSnap = await getDoc(doc(db, COLLECTIONS.REGISTRATIONS, user.uid));
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserRegistration;
                        if (data.hasEntryPass && data.paymentStatus === 'success') {
                            setHasPass(true);
                            if (!userProfile?.hasEntryPass) {
                                // Sync if missing
                                setDoc(doc(db, 'users', user.uid), { hasEntryPass: true }, { merge: true }).catch(console.error);
                            }
                        }
                        // Merge registration data (it might have more fields like accommodation)
                        // CRITICAL FIX: Exclude idCardUrl from merge if not completed/paid to prevent stale images
                        const { idCardUrl, ...restData } = data;
                        setFormData(prev => ({
                            ...prev,
                            ...restData,
                            // Only include ID Card if it's a valid completed registration
                            idCardUrl: (data.hasEntryPass || data.paymentStatus === 'success') ? idCardUrl : ''
                        }));

                        if (data.cityState) {
                            const [c, s] = data.cityState.split(',').map(s => s.trim());
                            setCity(c || ''); setState(s || '');
                        }
                    }

                    // FETCH EXISTING REGISTRATIONS (To prevent duplicates)
                    // We check all 'registrations' for this user with status 'success'
                    const qRegs = query(
                        collectionGroup(db, 'registrations'),
                        where('userId', '==', user.uid),
                        where('paymentStatus', '==', 'success')
                    );
                    const snapRegs = await getDocs(qRegs);
                    const paidIds = snapRegs.docs.map(d => (d.data() as any).eventId).filter(Boolean);
                    setExistingEventIds(paidIds);

                    // Also filter out Paid IDs from form data if they somehow persisted?
                    // Actually, keep them distinct. Form data is for NEW payments.

                } catch (e) { console.error(e); }
            }
        };

        const fetchEvents = async () => {
            // ... existing code ...
            try {
                const q = query(collection(db, 'events'), orderBy('title', 'asc'));
                const snap = await getDocs(q);
                const events = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Event))
                    .filter(e => e.category !== 'Flagship' && e.id !== 'hackathon');
                setAvailableEvents(events);
            } catch (error) { console.error(error); } finally { setPageLoading(false); }
        };

        init();
        fetchEvents();
    }, [user, userProfile]);

    // Handlers
    const handleInputChange = (field: keyof UserRegistration, value: any) => {
        setFormData(prev => {
            const updates = { ...prev, [field]: value };
            if (field === 'collegeType') {
                if (value === 'MVGR') {
                    updates.collegeName = 'MVGR College of Engineering';
                    setCity('Vizianagaram'); setState('Andhra Pradesh');
                } else {
                    updates.collegeName = ''; setCity(''); setState('');
                }
            }
            // Auto-save to localStorage (exclude large image fields - saved separately)
            if (field !== 'photoUrl' && field !== 'idCardUrl') {
                try {
                    const toSave = { ...updates };
                    delete toSave.photoUrl; // Exclude images from main save
                    delete toSave.idCardUrl;
                    safeStorage.setItem('draft_onboarding', JSON.stringify(toSave));
                } catch (e) { console.warn("Could not save draft", e); }
            }
            return updates;
        });
    };

    // Client-Side Image Compression to prevent Mobile WebView freezing on massive payloads
    const compressImage = (file: File, maxWidth = 1024): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to 70% quality JPEG
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };

            img.onerror = (e) => {
                URL.revokeObjectURL(objectUrl);
                reject(e);
            };

            img.src = objectUrl;
        });
    };

    // Deferred Upload Logic
    const handleFilePreview = async (file: File, field: 'idCardUrl' | 'photoUrl') => {
        if (file.size > 15 * 1024 * 1024) { toast.error("File size must be < 15MB"); return; }

        toast.loading("Processing image...", { id: `compress_${field}` });
        try {
            // Compress image aggressively before base64 encoding to prevent 10-minute freezes on mobile
            const compressedBase64 = await compressImage(file, 1024);
            toast.dismiss(`compress_${field}`);

            // Store in LocalStorage for persistence across reloads
            try {
                safeStorage.setItem(`draft_${field}`, compressedBase64);
            } catch (e) {
                console.warn("Could not save draft to local storage (likely size limit)", e);
            }
            // Update State
            handleInputChange(field, compressedBase64);
        } catch (error) {
            console.error("Image compression failed:", error);
            toast.dismiss(`compress_${field}`);
            toast.error("Failed to process image. Please try another one.");
        }
    };

    // Verify and Clear ID Card if needed (Fix for "Global Image" issue)
    React.useEffect(() => {
        // If the user does not have an entry pass (is new/draft), ensure ID Card is empty initially
        // unless they just uploaded it (checks if it's a blob/data url? no, just force clear on mount if needed)
        // Actually, better: if !hasPass and !formData.completed, we trust safeStorage. 
        // We disabled localStorage for idCardUrl.
        // So it should be empty. If it's not, it came from 'registrations' or 'userProfile'.

        const isNewUser = !userProfile?.hasEntryPass && !formData.completed;
        if (isNewUser) {
            // Check if idCardUrl looks like a legacy/test url (optional)
            // For now, let's just log. If the user insists it's "global", maybe we should clear it once on mount?
            // But valid drafts might be lost. 
            // Let's trust the "Change" button fix for now, but if idCardUrl matches the Profile Photo, clear it.
            if (formData.idCardUrl && formData.idCardUrl === formData.photoUrl) {
                setFormData(prev => ({ ...prev, idCardUrl: '' }));
            }
        }
    }, [userProfile, formData.completed]);

    // Restore drafts on mount
    React.useEffect(() => {
        // Restore text fields
        try {
            const saved = safeStorage.getItem('draft_onboarding');
            if (saved) {
                const parsed = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...parsed }));
                if (parsed.cityState) {
                    const [c, s] = parsed.cityState.split(',').map((s: string) => s.trim());
                    setCity(c || ''); setState(s || '');
                }
            }
        } catch (e) { console.warn("Could not restore draft", e); }

        // Restore image drafts
        const photoDraft = safeStorage.getItem('draft_photoUrl');
        // const idDraft = safeStorage.getItem('draft_idCardUrl');
        if (photoDraft) setFormData(prev => ({ ...prev, photoUrl: photoDraft }));
        // idDraft logic removed to force fresh upload for ID Card on reload/new session as per request
        // if (idDraft) setFormData(prev => ({ ...prev, idCardUrl: idDraft }));
    }, []);

    // Also save city/state to localStorage when they change
    React.useEffect(() => {
        if (city || state) {
            try {
                const saved = safeStorage.getItem('draft_onboarding');
                const data = saved ? JSON.parse(saved) : {};
                data.cityState = `${city}, ${state}`;
                safeStorage.setItem('draft_onboarding', JSON.stringify(data));
            } catch (e) { }
        }
    }, [city, state]);

    // Navigation & Logic
    const toggleEventSelection = (eventId: string) => {
        setFormData(prev => {
            const current = prev.paidEventIds || [];
            const isSelected = current.includes(eventId);
            const newIds = isSelected ? current.filter(id => id !== eventId) : [...current, eventId];

            if (isSelected) {
                setEventResponses(prevResp => {
                    const copy = { ...prevResp };
                    delete copy[eventId];
                    return copy;
                });
            } else {
                setEventResponses(prevResp => ({
                    ...prevResp,
                    [eventId]: {
                        isTeamLeader: true, teamName: '', teamMembers: [], customResponses: {}
                    }
                }));
            }
            return { ...prev, paidEventIds: newIds };
        });
    };

    const updateEventResponse = (eventId: string, field: keyof EventResponseData, value: any) => {
        setEventResponses(prev => ({
            ...prev,
            [eventId]: { ...prev[eventId], [field]: value }
        }));
    };

    const updateCustomResponse = (eventId: string, key: string, value: any) => {
        setEventResponses(prev => ({
            ...prev,
            [eventId]: {
                ...prev[eventId],
                customResponses: { ...prev[eventId].customResponses, [key]: value }
            }
        }));
    };

    const verifyTeamMember = async (eventId: string, memberIdx: number, regNo: string) => {
        if (!regNo || regNo.length < 5) return;
        if (regNo.toUpperCase() === formData.regNo?.toUpperCase()) return; // Self check handled in validation

        try {
            const q = query(collection(db, COLLECTIONS.USERS), where('regNo', '==', regNo.toUpperCase()));
            const querySnapshot = await getDocs(q);

            setEventResponses(prev => {
                const updated = { ...prev };
                if (updated[eventId]?.teamMembers?.[memberIdx]) {
                    if (querySnapshot.empty) {
                        updated[eventId].teamMembers[memberIdx].verificationError = "User not found.";
                        updated[eventId].teamMembers[memberIdx].isVerified = false;
                    } else {
                        const userDoc = querySnapshot.docs[0].data();
                        if (userDoc.isOnboarded || userDoc.hasEntryPass) {
                            updated[eventId].teamMembers[memberIdx].verificationError = null;
                            updated[eventId].teamMembers[memberIdx].isVerified = true;
                            updated[eventId].teamMembers[memberIdx].name = userDoc.fullName;
                            updated[eventId].teamMembers[memberIdx].phone = userDoc.mobileNumber;
                        } else {
                            updated[eventId].teamMembers[memberIdx].verificationError = "User NOT registered.";
                            updated[eventId].teamMembers[memberIdx].isVerified = false;
                        }
                    }
                }
                return updated;
            });
        } catch (error) { console.error(error); }
    };

    const handleMemberChange = (eventId: string, index: number, field: keyof TeamMemberInput, value: string) => {
        setEventResponses(prev => {
            const members = [...(prev[eventId].teamMembers || [])];
            if (!members[index]) members[index] = { name: '', regNo: '', phone: '' };
            members[index] = { ...members[index], [field]: value };
            if (field === 'regNo') { members[index].isVerified = false; members[index].verificationError = null; }
            return {
                ...prev,
                [eventId]: { ...prev[eventId], teamMembers: members }
            };
        });
        if (field === 'regNo' && value.length >= 6) {
            setTimeout(() => verifyTeamMember(eventId, index, value), 800);
        }
    };

    const addMember = (eventId: string) => setEventResponses(prev => ({ ...prev, [eventId]: { ...prev[eventId], teamMembers: [...prev[eventId].teamMembers, { name: '', regNo: '', phone: '' }] } }));
    const removeMember = (eventId: string, index: number) => setEventResponses(prev => ({ ...prev, [eventId]: { ...prev[eventId], teamMembers: prev[eventId].teamMembers.filter((_, i) => i !== index) } }));

    // Price Calculation
    const getPricing = () => {
        const baseFee = formData.collegeType === 'MVGR' ? 200 : 300;
        let eventsFee = 0;
        let accommodationFee = 0;
        const eventsBreakdown: { title: string, count: number, cost: number }[] = [];

        formData.paidEventIds?.forEach(id => {
            const event = availableEvents.find(e => e.id === id);
            if (!event) return;
            // New Logic: Always 1 count (Self only). Teams pay individually.
            const count = 1;
            const cost = count * 100;
            eventsFee += cost;
            eventsBreakdown.push({ title: event.title, count, cost });
        });

        if (formData.accommodationRequired) {
            const pax = 1; // Always 1 person (Self)
            const days = formData.accommodationDates?.length || 0;
            const rate = formData.accommodationType === 'without_food' ? 300 : 500;
            accommodationFee = pax * days * rate;
        }

        return { baseFee, eventsFee, accommodationFee, total: baseFee + eventsFee + accommodationFee, eventsBreakdown };
    };
    const pricing = getPricing();

    const checkDuplicateRegNo = async (regNo: string) => {
        try {
            const q = query(collection(db, COLLECTIONS.USERS), where('regNo', '==', regNo), where('isOnboarded', '==', true));
            const snapshot = await getDocs(q);
            return !snapshot.empty && snapshot.docs[0].id !== user?.uid;
        } catch { return false; }
    };

    const validateStep = async (step: number): Promise<string | null> => {
        if (step === 1) {
            if (!formData.photoUrl) return "Profile Photo is required";
            if (!formData.fullName?.trim()) return "Full Name is required";
            if (!formData.mobileNumber?.trim() || !/^[6-9]\d{9}$/.test(formData.mobileNumber)) return "Valid 10-digit Mobile is required";
            if (!formData.gender) return "Gender is required";
            if (!formData.collegeType) return "Select College Type";
            if (!formData.regNo?.trim()) return "Registration Number is required";
            if (!formData.collegeName?.trim()) return "College Name is required";
            if (!city.trim() || !state.trim()) return "City and State required";
            if (!formData.idCardUrl) return "ID Card required";
            if (formData.accommodationRequired) {
                if (!formData.accommodationType) return "Please select the Accommodation Package Level";
                if (!formData.accommodationDates || formData.accommodationDates.length === 0) return "Please select at least one date for accommodation";
            }
            setLoading(true);
            const isDup = await checkDuplicateRegNo(formData.regNo);
            setLoading(false);
            if (isDup) return `RegNo '${formData.regNo}' is already registered.`;
            return null;
        }
        if (step === 2) return null;
        if (hasComplexEvents && step === 3) {
            for (const event of complexEvents) {
                const resp = eventResponses[event.id!] || {}; // Ensure object exists
                if (!resp) return `Please fill details for ${event.title}`;

                // New Team Logic Validation
                if ((event.maxTeamSize > 1 || event.minTeamSize > 1)) {
                    if (resp.isTeamLeader) {
                        // Creating Team: Needs Name
                        if (!resp.teamName?.trim()) return `Team Name is required for ${event.title} (Create Mode)`;
                    } else {
                        // Joining Team: Needs ID
                        if (!resp.teamId?.trim()) return `Team ID is required for ${event.title} (Join Mode). Ask your Leader.`;
                        try {
                            await verifyTeamId(event.id!, resp.teamId.trim());
                        } catch (error: any) {
                            return `Error for ${event.title}: ${error.message || "Invalid Team"}`;
                        }
                    }
                } else if (event.formConfig?.askTeamName && !resp.teamName) {
                    // Fallback for events that just ask Name without strict Logic
                    return `Team Name required for ${event.title}`;
                }

                // Skip custom fields validation for Team Members (Join Mode)
                const isTeamEvent = event.minTeamSize > 1;
                const isJoiner = isTeamEvent && !resp.isTeamLeader;

                if (!isJoiner) {
                    if (event.formConfig?.askPptUrl && !resp.customResponses?.pptUrl) return `PPT URL required for ${event.title}`;
                    if (event.formConfig?.customFields) {
                        for (const f of event.formConfig.customFields) if (f.required && !resp.customResponses?.[f.id]) return `${f.label} is required`;
                    }
                }
            }
            return null;
        }
        return null;
    };

    const handleNext = async () => {
        const error = await validateStep(currentStep);
        if (error) { toast.error(error); return; }
        if (currentStep < STEPS.length) setCurrentStep(prev => prev + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // --- FINAL SAFETY CHECK ---
            const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
            if (userSnap.exists() && userSnap.data().hasEntryPass) {
                toast.error("You already have an Entry Pass!");
                window.location.href = '/dashboard';
                return;
            }

            // Legacy Check (for safety during migration)
            const freshSnap = await getDoc(doc(db, COLLECTIONS.REGISTRATIONS, user.uid));
            if (freshSnap.exists() && freshSnap.data().hasEntryPass) {
                toast.error("You already have an Entry Pass!");
                window.location.href = '/dashboard';
                return;
            }

            // --- 0. Upload Images if Base64 ---
            let finalPhotoUrl = formData.photoUrl;
            let finalIdCardUrl = formData.idCardUrl;

            const uploadBase64 = async (base64Data: string, field: string) => {
                let blob: Blob;
                try {
                    // Fast path: native fetch, 1000x faster and doesn't block UI thread
                    const res = await fetch(base64Data);
                    blob = await res.blob();
                } catch (e) {
                    // Fallback for extremely old WebViews
                    const arr = base64Data.split(',');
                    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    blob = new Blob([u8arr], { type: mime });
                }

                // Fix: Generate Unique Filename
                const uniqueSuffix = Date.now();
                const file = new File([blob], `${field}_${uniqueSuffix}.jpg`, { type: 'image/jpeg' });

                // Use a dedicated folder for Entry Pass uploads as requested
                const folderName = 'entrypass';

                // Prefix logic: Use RegNo + Name if available, else UserID
                const safeName = (formData.fullName || 'User').replace(/[^a-zA-Z0-9]/g, '_');
                const safeReg = (formData.regNo || user.uid).replace(/[^a-zA-Z0-9]/g, '_');

                // Construct Prefix for ALL fields (ID and Photo) to avoid collisions
                const type = field === 'idCardUrl' ? 'ID' : 'PHOTO';
                const fileNamePrefix = `${safeReg}_${uniqueSuffix}_${type}`;

                // Pass 'entrypass' as the preset override
                return await uploadFile(file, user.uid, fileNamePrefix, folderName, 'image', 'entrypass');
            };

            if (finalPhotoUrl?.startsWith('data:')) {
                toast.info("Uploading Profile Photo...");
                finalPhotoUrl = await uploadBase64(finalPhotoUrl, 'photoUrl');
            }
            if (finalIdCardUrl?.startsWith('data:')) {
                toast.info("Uploading ID Card...");
                finalIdCardUrl = await uploadBase64(finalIdCardUrl, 'idCardUrl');
            }

            // 1. Save Main Registration (Consolidated to USERS collection)
            const finalData: UserRegistration = {
                ...formData as UserRegistration,
                photoUrl: finalPhotoUrl!,
                idCardUrl: finalIdCardUrl!,
                userId: user.uid,
                email: user.email!,
                completed: false, // Will be set true by payment callback on success
                createdAt: serverTimestamp(),
                aftCoins: 0,
                hasEntryPass: false, // Wait for Payment Success
                hasHackathonPass: false,
                paidEventIds: formData.paidEventIds || [],
                cityState: `${city}, ${state}`
            };

            // Write profile data WITHOUT isOnboarded - the payment callback sets that on success.
            // We must NOT write isOnboarded:true here or the AuthGuard will think the user is registered.
            await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                ...finalData
            }, { merge: true });

            // LEGACY: Write minimal draft to registrations as well
            await setDoc(doc(db, COLLECTIONS.REGISTRATIONS, user.uid), finalData);

            // Clear Drafts
            safeStorage.removeItem('draft_photoUrl');
            safeStorage.removeItem('draft_idCardUrl');

            // Firestore rejects `undefined` values — strip them all recursively before any write
            const sanitiseForFirestore = (obj: any): any => {
                if (obj === null || obj === undefined) return null;
                if (Array.isArray(obj)) return obj.map(sanitiseForFirestore);
                if (typeof obj === 'object' && !(obj instanceof Date)) {
                    const clean: any = {};
                    for (const [k, v] of Object.entries(obj)) {
                        if (v !== undefined) clean[k] = sanitiseForFirestore(v);
                    }
                    return clean;
                }
                return obj;
            };

            // 2. Save Complex Event Registrations (Sub-collection)
            for (const event of complexEvents) {
                const resp = eventResponses[event.id!];
                if (!resp) continue;

                const isTeamEvent = (event.minTeamSize > 1 || event.maxTeamSize > 1);
                let resolvedTeamId = resp.teamId || '';
                let resolvedTeamName = resp.teamName || '';

                // --- TEAM LEADER: Create entry in 'teams' collection to generate readable teamId ---
                if (isTeamEvent && resp.isTeamLeader && resp.teamName?.trim()) {
                    try {
                        const { createTeam } = await import('@/lib/team-logic');
                        const readableId = await createTeam(
                            event.id!,
                            resp.teamName.trim(),
                            { uid: user.uid, name: formData.fullName || user.displayName || user.uid, regNo: formData.regNo || '' },
                            event.maxTeamSize || 4
                        );
                        resolvedTeamId = readableId;
                        resolvedTeamName = resp.teamName.trim();
                        // Keep local state in sync so the payment step can reference it
                        setEventResponses(prev => ({
                            ...prev,
                            [event.id!]: { ...prev[event.id!], teamId: readableId }
                        }));
                    } catch (teamErr: any) {
                        // If team creation fails (e.g. name already taken), abort with user-friendly message
                        throw new Error(`Team creation failed for "${event.title}": ${teamErr.message || 'Unknown error'}`);
                    }
                }

                // --- TEAM MEMBER: Join the existing team in 'teams' collection ---
                if (isTeamEvent && !resp.isTeamLeader && resp.teamId?.trim()) {
                    try {
                        const { joinTeam } = await import('@/lib/team-logic');
                        const joinedData = await joinTeam(event.id!, resp.teamId.trim(), {
                            uid: user.uid,
                            name: formData.fullName || user.displayName || user.uid,
                            regNo: formData.regNo || ''
                        });
                        resolvedTeamId = joinedData.resolvedTeamId;
                        resolvedTeamName = joinedData.resolvedTeamName;
                    } catch (joinErr: any) {
                        // joinTeam throws if the team is full/locked/invalid — surface it clearly
                        throw new Error(`Could not join team "${resp.teamId}" for "${event.title}": ${joinErr.message || 'Unknown error'}`);
                    }
                }

                // Build responses object — only include defined fields
                const responsesObj: Record<string, any> = {};
                if (resolvedTeamName) responsesObj.teamName = resolvedTeamName;
                if (resolvedTeamId) responsesObj.teamId = resolvedTeamId;
                if (resp.customResponses) {
                    Object.entries(resp.customResponses).forEach(([k, v]) => {
                        if (v !== undefined && v !== null) responsesObj[k] = v;
                    });
                }

                const regPayload = sanitiseForFirestore({
                    eventId: event.id,
                    userId: user.uid,
                    paymentStatus: 'pending',
                    status: 'active',
                    teamId: resolvedTeamId || null,       // top-level for easy querying
                    teamName: resolvedTeamName || null,   // top-level for easy querying
                    responses: responsesObj,
                    teamMembers: (resp.isTeamLeader && resp.teamMembers && resp.teamMembers.length > 0)
                        ? resp.teamMembers.map(m => ({
                            name: m.name || '',
                            regNo: m.regNo || '',
                            phone: m.phone || '',
                            isVerified: m.isVerified || false,
                            verificationError: m.verificationError || null
                        }))
                        : [],
                    role: resp.isTeamLeader ? 'Leader' : 'Member',
                    createdAt: serverTimestamp()
                });

                await setDoc(
                    doc(db, 'events', event.id!, 'registrations', user.uid),
                    regPayload
                );
            }

            // --- 3. Initiate Payment (Paytm) ---
            const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
            const orderId = `ORD_${Date.now()}_${uniqueSuffix}`; // ~22 chars
            const amount = pricing.total.toString();

            // 15-second timeout so the user isn't stuck with an infinite spinner
            const paymentAbort = new AbortController();
            const paymentTimeout = setTimeout(() => paymentAbort.abort(), 15000);

            let response: Response;
            try {
                response = await fetch('/api/paytm/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: paymentAbort.signal,
                    body: JSON.stringify({
                        amount,
                        email: formData.email || user.email,
                        phone: formData.mobileNumber,
                        studentName: formData.fullName,
                        orderId,
                        userId: user.uid,
                        eventIds: formData.paidEventIds || []
                    })
                });
            } catch (fetchErr: any) {
                if (fetchErr.name === 'AbortError') {
                    throw new Error('Payment gateway is temporarily unreachable. Please check your internet connection and try again.');
                }
                throw fetchErr;
            } finally {
                clearTimeout(paymentTimeout);
            }

            const data = await response.json();

            if (!data.success || !data.txnToken) {
                throw new Error(data.message || "Failed to initiate payment");
            }

            // --- Short Circuit: If Initiate gave us the Link (Common in UPI Intent) ---
            if (data.deepLink) {
                console.log("Deep Link received directly from Initiate:", data.deepLink);
                // Navigate immediately — do NOT await before this on iOS (gesture context lost)
                window.location.href = data.deepLink;
                return;
            }

            // --- Payment Redirect ---
            const baseUrl = "https://securegw.paytm.in";
            const paytmUrl = `${baseUrl}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${orderId}&txnToken=${data.txnToken}`;

            // IMPORTANT: On iOS Safari, any `await` before window.location.href can cause
            // the browser to treat the navigation as an unsolicited popup and block it.
            // Fire the redirect immediately
            toast.info("Opening payment gateway...", { duration: 5000 });
            window.location.assign(paytmUrl);
            return;

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Registration failed. Please try again.");
            setLoading(false);
        }
    };


    // Grouping
    const eventsByCategory = React.useMemo(() => {
        const grouped: Record<string, Event[]> = {};

        // Helper to normalize category name for matching
        const normalize = (c: string) => {
            if (!c) return 'Other';
            const lower = c.toLowerCase();
            if (lower.includes('tech')) return 'Tech Frontier Challenges';
            if (lower.includes('brain')) return 'Brain Wave Challenges';
            if (lower.includes('skill')) return 'Skill Forge Workshops';
            if (lower.includes('media') || lower.includes('esports') || lower.includes('e-sports')) return 'Multi Media & E-Sports';
            if (lower.includes('cultural')) return 'Cultural Events';
            if (lower.includes('sport')) return 'Sports';
            if (lower.includes('hack')) return 'Hackathon';
            return c; // Keep original if no match
        };

        availableEvents.forEach(e => {
            const rawCat = e.category || 'Other';
            const cat = normalize(rawCat);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(e);
        });
        return grouped;
    }, [availableEvents]);

    if (authLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-red-600" />
                <p className="text-neutral-500 text-sm animate-pulse">Authenticating...</p>
            </div>
        );
    }

    // Note: Previously there was a hard return here if (hasPass) { ... }
    // which blocked users who already had an entry pass from registering for Hackathon/Other events.
    // It has been removed. The banner at the top of the form (line 771) handles the UI messaging.

    return (
        <RoyalFormLayout
            title="Aadhrita Registration"
            subtitle="Join a Legacy Reawakened"
            showStep={true} currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS}
            backgroundImage="/bg-onboarding.webp"
        >
            {/* --- Entry Pass Holder Banner --- */}
            {hasPass && (
                <div className="max-w-4xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-gradient-to-r from-emerald-900/40 to-black border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/bg-onboarding.webp')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none" />

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className={cn("text-xl md:text-2xl font-bold text-white mb-1", cinzel.className)}>
                                    <span className="text-emerald-400">Entry Pass</span> Active
                                </h2>
                                <p className="text-emerald-200/80 text-sm max-w-md">
                                    You have already secured your spot. You can view your pass or register for more events from the dashboard.
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => router.push('/dashboard')}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-6 rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 relative z-10 whitespace-nowrap"
                        >
                            Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* --- Step 1: Identity & Stay --- */}
            {!hasPass && currentStep === 1 && (
                <div className={cn("space-y-8 max-w-2xl mx-auto transition-opacity duration-300", hasPass && "opacity-60 pointer-events-none grayscale-[0.5]")}>
                    {/* Identity Section */}
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h2 className={cn("text-lg font-bold text-neutral-200 mb-6 flex items-center gap-2", cinzel.className)}>
                            <UserCircle2 className="w-5 h-5 text-red-500" /> Identity Details
                        </h2>
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-6">
                            <div className="shrink-0 flex flex-col items-center gap-3">
                                {/* Photo Upload Refactored: Camera & File Options */}
                                <div className="relative group">
                                    <div
                                        className={cn("w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-lg bg-black/40 flex items-center justify-center relative transition-all",
                                            !formData.photoUrl && "border-dashed border-neutral-700"
                                        )}
                                    >
                                        {formData.photoUrl ? (
                                            <img
                                                src={formData.photoUrl}
                                                alt="Profile"
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; handleInputChange('photoUrl', ''); toast.error("Image load failed"); }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                {uploading === 'photoUrl' ? <Loader2 className="w-8 h-8 text-red-500 animate-spin" /> : <UserCircle2 className="w-12 h-12 text-neutral-600" />}
                                                <span className="text-[10px] text-neutral-500 font-bold uppercase">Add Photo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons - Always visible */}
                                    <div className="flex gap-2 mt-2 justify-center">
                                        <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold px-3 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 border border-white/20" onClick={() => photoInputRef.current?.click()}>
                                            <UploadCloud className="w-3 h-3 mr-1.5" /> {formData.photoUrl ? 'Change' : 'Gallery'}
                                        </Button>
                                        <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold px-3 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 border border-white/20" onClick={() => photoCameraRef.current?.click()}>
                                            <Camera className="w-3 h-3 mr-1.5" /> Camera
                                        </Button>
                                    </div>

                                    {/* Hidden file inputs */}
                                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFilePreview(e.target.files[0], 'photoUrl')} />
                                    <input ref={photoCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && handleFilePreview(e.target.files[0], 'photoUrl')} />
                                </div>

                                <div className="text-center">
                                    <span className="text-xs text-neutral-400 font-medium block">Profile Photo <span className="text-red-500">*</span></span>
                                    {formData.photoUrl && <p className="text-[10px] text-green-500 font-bold mt-1 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Looking Good!</p>}
                                </div>

                                <div className="mt-1 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-[10px] text-yellow-500 text-center max-w-[150px]">
                                    <span className="font-bold block mb-1">IMPORTANT</span>
                                    Face must be clear. Used for Security Verification.
                                </div>
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div><Label className="text-neutral-300 font-semibold text-sm">Full Name <span className="text-red-500">*</span></Label><Input className="bg-black/40 text-white border-white/10 mt-1 placeholder:text-neutral-600 focus:border-red-500/50" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} placeholder="As per Official Records" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label className="text-neutral-300 font-semibold text-sm">WhatsApp No. <span className="text-red-500">*</span></Label><Input type="tel" className="bg-black/40 text-white border-white/10 mt-1 placeholder:text-neutral-600 focus:border-red-500/50" value={formData.mobileNumber} onChange={(e) => handleInputChange('mobileNumber', e.target.value)} placeholder="+91" /></div>
                                    <div>
                                        <Label className="text-neutral-300 font-semibold text-sm">Gender <span className="text-red-500">*</span></Label>
                                        <Select value={formData.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                                            <SelectTrigger className="bg-black/40 border-white/10 mt-1 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-white/10 text-white">
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Academic Section */}
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h2 className={cn("text-lg font-bold text-neutral-200 mb-6 flex items-center gap-2", cinzel.className)}><Building2 className="w-5 h-5 text-red-500" /> Academic & College Details</h2>
                        <div className="space-y-5">
                            <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/20">
                                <Label className="text-neutral-200 font-bold mb-3 block">Are you from MVGR College?</Label>
                                <RadioGroup value={formData.collegeType} onValueChange={(val) => handleInputChange('collegeType', val)} className="flex gap-6">
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-red-500/30 shadow-sm">
                                        <RadioGroupItem value="MVGR" id="mvgr-yes" className="text-red-500 border-red-500" />
                                        <Label htmlFor="mvgr-yes" className="text-neutral-300 font-medium cursor-pointer">Yes, MVGR Student</Label>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 shadow-sm">
                                        <RadioGroupItem value="OTHER" id="mvgr-no" className="text-neutral-500 border-neutral-600" />
                                        <Label htmlFor="mvgr-no" className="text-neutral-400 font-medium cursor-pointer">No, Other College</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                        </div>


                        <div className="grid md:grid-cols-2 gap-5">
                            <div className="space-y-1"><Label className="text-neutral-300 font-semibold text-sm">College Name <span className="text-red-500">*</span></Label><Input className={cn("bg-black/40 text-white border-white/10 placeholder:text-neutral-600 focus:border-red-500/50", formData.collegeType === 'MVGR' && "opacity-50 cursor-not-allowed")} value={formData.collegeName} onChange={(e) => handleInputChange('collegeName', e.target.value)} disabled={formData.collegeType === 'MVGR'} /></div>
                            <div className="space-y-1"><Label className="text-neutral-300 font-semibold text-sm">Reg / Roll Number <span className="text-red-500">*</span></Label><Input className="bg-black/40 text-white border-white/10 uppercase tracking-widest font-mono placeholder:text-neutral-600 focus:border-red-500/50" value={formData.regNo} onChange={(e) => handleInputChange('regNo', e.target.value.toUpperCase())} placeholder={formData.collegeType === 'MVGR' ? "21331A05..." : "University ID"} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <Label className="text-neutral-300 font-semibold text-sm">Branch <span className="text-red-500">*</span></Label>
                                <Select value={formData.degreeBranch} onValueChange={(val) => handleInputChange('degreeBranch', val)}>
                                    <SelectTrigger className="bg-black/40 border-white/10 mt-1 text-white"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                                    <SelectContent className="bg-neutral-900 border-white/10 text-white">
                                        <SelectItem value="CIVIL">CIVIL</SelectItem>
                                        <SelectItem value="CHEMICAL">CHEMICAL</SelectItem>
                                        <SelectItem value="CSE">CSE</SelectItem>
                                        <SelectItem value="ECE">ECE</SelectItem>
                                        <SelectItem value="EEE">EEE</SelectItem>
                                        <SelectItem value="IE&CT">IE&CT</SelectItem>
                                        <SelectItem value="MECH">MECH</SelectItem>
                                        <SelectItem value="MBA">MBA</SelectItem>
                                        <SelectItem value="CIC(Data Engg)">CIC(Data Engg)</SelectItem>
                                        <SelectItem value="CSM(Data Engg)">CSM(Data Engg)</SelectItem>
                                        <SelectItem value="CSD(Data Engg)">CSD(Data Engg)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-neutral-300 font-semibold text-sm">Year <span className="text-red-500">*</span></Label>
                                <Select value={formData.yearOfStudy} onValueChange={(val) => handleInputChange('yearOfStudy', val)}>
                                    <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Year" /></SelectTrigger>
                                    <SelectContent className="bg-neutral-900 border-white/10 text-white">
                                        {[1, 2, 3, 4].map(y => <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1"><Label className="text-neutral-300 font-semibold text-sm">City <span className="text-red-500">*</span></Label><Input className={cn("bg-black/40 text-white border-white/10 placeholder:text-neutral-600 focus:border-red-500/50", formData.collegeType === 'MVGR' && "opacity-50 cursor-not-allowed")} value={city} onChange={(e) => setCity(e.target.value)} disabled={formData.collegeType === 'MVGR'} placeholder="Town/City" /></div>
                            <div className="space-y-1"><Label className="text-neutral-300 font-semibold text-sm">State <span className="text-red-500">*</span></Label><Input list="indian-states" className={cn("bg-black/40 text-white border-white/10 placeholder:text-neutral-600 focus:border-red-500/50", formData.collegeType === 'MVGR' && "opacity-50 cursor-not-allowed")} value={state} onChange={(e) => setState(e.target.value)} disabled={formData.collegeType === 'MVGR'} placeholder="Type to search..." /><datalist id="indian-states">{INDIAN_STATES.map((s) => (<option key={s} value={s} />))}</datalist></div>
                        </div>
                        <div className="pt-2">
                            <Label className="text-neutral-300 font-semibold text-sm mb-2 block">College ID Card <span className="text-red-500">*</span></Label>
                            <div className={cn("border-2 border-dashed border-white/10 rounded-xl p-4 hover:bg-white/5 transition-colors text-center relative", !formData.idCardUrl && "bg-black/20")}>
                                {formData.idCardUrl ? (
                                    <div className="relative">
                                        <img src={formData.idCardUrl} className="h-32 mx-auto rounded-lg object-contain shadow-sm" alt="ID" />
                                        {/* Visible Change Buttons for ID Card */}
                                        <div className="flex gap-2 mt-3 justify-center">
                                            <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold px-3 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 border border-white/20" onClick={() => idInputRef.current?.click()}>
                                                <UploadCloud className="w-3 h-3 mr-1" />Change
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-8 text-[10px] font-bold px-3 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 border border-white/20" onClick={() => idCameraRef.current?.click()}>
                                                <Camera className="w-3 h-3 mr-1" />Camera
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-3">
                                        {uploading === 'idCardUrl' ? (<Loader2 className="w-8 h-8 text-red-600 animate-spin" />) : (
                                            <div className="flex gap-3">
                                                <Button size="sm" variant="secondary" className="h-9 text-xs font-bold px-4 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 border border-white/20" onClick={() => idInputRef.current?.click()}>
                                                    <UploadCloud className="w-4 h-4 mr-1.5" />Gallery
                                                </Button>
                                                <Button size="sm" variant="secondary" className="h-9 text-xs font-bold px-4 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 border border-white/20" onClick={() => idCameraRef.current?.click()}>
                                                    <Camera className="w-4 h-4 mr-1.5" />Camera
                                                </Button>
                                            </div>
                                        )}
                                        <span className="text-[10px] text-neutral-500 mt-2 font-medium">Upload or take a photo of your College ID</span>
                                    </div>
                                )}
                                {/* HIDDEN INPUTS MOVED HERE TO ENSURE THEY EXIST EVEN IF IMAGE IS PRESENT */}
                                <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFilePreview(e.target.files[0], 'idCardUrl')} disabled={uploading === 'idCardUrl'} />
                                <input ref={idCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFilePreview(e.target.files[0], 'idCardUrl')} />
                            </div>
                        </div>
                    </div>


                    {/* Accommodation Section Refactored */}
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                        <h2 className={cn("text-lg font-bold text-neutral-200 mb-6 flex items-center gap-2", cinzel.className)}>
                            <Building2 className="w-5 h-5 text-red-500" /> Accommodation (Optional)
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-amber-900/10 rounded-xl border border-amber-700/20">
                                <Checkbox
                                    id="acc-required"
                                    checked={formData.accommodationRequired}
                                    onCheckedChange={(c) => handleInputChange('accommodationRequired', c === true)}
                                    className="mt-1 border-white/20 data-[state=checked]:bg-amber-600 data-[state=checked]:text-black"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="acc-required" className="text-neutral-200 font-bold block cursor-pointer">
                                        I need Accommodation
                                    </Label>

                                    {formData.accommodationRequired && (
                                        <div className="mt-4 pt-4 border-t border-amber-700/30">
                                            <Label className="text-sm font-semibold text-neutral-300 mb-3 block">Select Package Level:</Label>
                                            <RadioGroup
                                                value={formData.accommodationType || 'with_food'}
                                                onValueChange={(val) => handleInputChange('accommodationType', val as any)}
                                                className="grid sm:grid-cols-2 gap-3"
                                            >
                                                <div className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-amber-500/30">
                                                    <RadioGroupItem value="with_food" id="acc-food" className="mt-0.5 text-amber-500 border-amber-500" />
                                                    <div>
                                                        <Label htmlFor="acc-food" className="text-neutral-200 font-medium cursor-pointer block">With Food</Label>
                                                        <span className="text-[10px] text-amber-500 font-bold tracking-wide">₹500 / DAY</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-white/10">
                                                    <RadioGroupItem value="without_food" id="acc-no-food" className="mt-0.5" />
                                                    <div>
                                                        <Label htmlFor="acc-no-food" className="text-neutral-300 font-medium cursor-pointer block">Without Food</Label>
                                                        <span className="text-[10px] text-zinc-400 font-bold tracking-wide">₹300 / DAY</span>
                                                    </div>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {formData.accommodationRequired && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {/* Date Selection */}
                                    <div className="space-y-4">
                                        <Label className="text-neutral-300 font-semibold text-sm">Select Dates</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {['11-03-2026', '12-03-2026', '13-03-2026'].map((date) => (
                                                <div
                                                    key={date}
                                                    onClick={() => {
                                                        const current = formData.accommodationDates || [];
                                                        const exists = current.includes(date);
                                                        const updated = exists ? current.filter(d => d !== date) : [...current, date];
                                                        handleInputChange('accommodationDates', updated);
                                                        handleInputChange('numberOfDays', updated.length); // Update Count
                                                    }}
                                                    className={cn(
                                                        "cursor-pointer border py-4 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 hover:scale-[1.02] active:scale-95",
                                                        formData.accommodationDates?.includes(date)
                                                            ? "bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] font-bold"
                                                            : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/30 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="text-sm uppercase tracking-wider">
                                                        {(() => {
                                                            const parts = date.split('-'); // 11-03-2026
                                                            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                            return `${parts[0]} ${months[parseInt(parts[1]) - 1]}`;
                                                        })()}
                                                    </div>
                                                    <div className="text-[10px] opacity-80 font-medium">12:00 PM - 12:00 PM</div>
                                                    <div className="text-[9px] opacity-60">(24 Hours)</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl mt-4 space-y-2">
                                            <p className="text-xs text-neutral-400 leading-relaxed">
                                                <span className="text-white font-bold">Please Note:</span> Accommodation is provided for <span className="text-white font-bold">you (1 Person)</span> only.
                                            </p>
                                            <p className="text-xs text-neutral-400">
                                                For early check-in or extended stay requests, please contact: <br /> <span className="font-bold text-white">A. Lahari: +917396900572</span> or<br />  <span className="font-bold text-white">M. Sai Kiran: 9014957038</span> (HOSPITALITY TEAM)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div >
                </div >
            )
            }

            {/* --- Step 2: Events --- */}
            {
                !hasPass && currentStep === 2 && (
                    <div className="space-y-8 max-w-4xl mx-auto">
                        <div className="text-center mb-6"><h2 className={cn("text-2xl font-bold text-neutral-200 mb-2", cinzel.className)}>Select Your Events</h2><p className="text-sm text-neutral-400">Add paid events to your pass (₹100 each). You can also add these later!</p></div>
                        {pageLoading ? (<div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-red-600" /></div>) : (
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    {EVENT_CATEGORIES.map((catDef) => {
                                        const category = catDef.label;
                                        const events = eventsByCategory[category];
                                        if (!events || events.length === 0) return null;

                                        return (
                                            <details key={category} className="group open:mb-8 transition-all" open>
                                                <summary className="flex items-center gap-4 cursor-pointer list-none select-none mb-4 group-open:mb-4">
                                                    <h3 className="text-xl font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                                                        {category}
                                                        <ChevronRight className="w-5 h-5 text-neutral-500 group-open:rotate-90 transition-transform" />
                                                    </h3>
                                                    <div className="h-px flex-1 bg-white/10 group-open:bg-white/20 transition-colors"></div>
                                                </summary>

                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {events.map(event => {
                                                        const isAlreadyRegistered = existingEventIds.includes(event.id!);
                                                        return (
                                                            <div key={event.id}
                                                                onClick={() => !isAlreadyRegistered && toggleEventSelection(event.id!)}
                                                                className={cn("relative p-5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-full hover:shadow-lg hover:border-red-500/50",
                                                                    formData.paidEventIds?.includes(event.id!) ? "bg-red-900/10 border-red-800 shadow-md ring-1 ring-red-500/20" : "bg-white/5 border-white/10",
                                                                    isAlreadyRegistered && "opacity-50 cursor-not-allowed bg-green-900/10 border-green-800/20"
                                                                )}>

                                                                {/* Event Type Tag */}
                                                                <div className="absolute top-0 right-0">
                                                                    <div className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl border-b border-l",
                                                                        event.maxTeamSize > 1
                                                                            ? "bg-purple-900/30 text-purple-200 border-white/5"
                                                                            : "bg-blue-900/30 text-blue-200 border-white/5"
                                                                    )}>
                                                                        {event.maxTeamSize > 1
                                                                            ? (event.minTeamSize === 1 ? "Team / Solo" : "Team Event")
                                                                            : "Solo Event"}
                                                                    </div>
                                                                </div>

                                                                {/* Selection Tick Override */}
                                                                {formData.paidEventIds?.includes(event.id!) ? (
                                                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-md border-2 border-black z-10">
                                                                        <CheckCircle className="w-5 h-5 text-white" />
                                                                    </div>
                                                                ) : isAlreadyRegistered ? (
                                                                    <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/20 uppercase">
                                                                        Registered
                                                                    </div>
                                                                ) : (
                                                                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-neutral-700 bg-neutral-900 z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                )}

                                                                <div className="mt-4">
                                                                    <div className="flex justify-between items-start mb-2"><div className={cn("text-xs font-bold px-2 py-1 rounded transition-colors border", formData.paidEventIds?.includes(event.id!) ? "bg-red-500/20 text-red-200 border-red-500/20" : "bg-neutral-800 text-neutral-400 border-neutral-700")}>₹100 for participation/person</div></div>
                                                                    <h4 className={cn("font-bold text-neutral-200 mb-2 lg:text-lg group-hover:text-red-400 transition-colors", formData.paidEventIds?.includes(event.id!) && "text-red-400")}>{event.title}</h4>
                                                                    <p className="text-xs text-neutral-400 line-clamp-3 mb-4 leading-relaxed">{event.description}</p>

                                                                    {/* Event Timing & Venue */}
                                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                                        {(event.date || event.time || event.schedule) && (
                                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-200 bg-white/10 px-2 py-1.5 rounded border border-white/10 shadow-sm">
                                                                                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                                                                <span>{event.date ? `${event.date} ${event.time ? `• ${event.time}` : ''}` : event.schedule || 'TBA'}</span>
                                                                            </div>
                                                                        )}
                                                                        {event.venue && (
                                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-200 bg-white/10 px-2 py-1.5 rounded border border-white/10 shadow-sm">
                                                                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                                                <span>{event.venue}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {((event.maxTeamSize > 1) || event.formConfig) && <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3" /> Needs Extra Details</div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </details>
                                        );
                                    })}

                                    {/* Fallback for Uncategorized Events */}
                                    {Object.entries(eventsByCategory).map(([category, events]) => {
                                        if (EVENT_CATEGORIES.some(c => c.label === category)) return null; // Already rendered
                                        return (
                                            <details key={category} className="group open:mb-8 transition-all" open>
                                                <summary className="flex items-center gap-4 cursor-pointer list-none select-none mb-4 group-open:mb-4">
                                                    <h3 className="text-xl font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                                                        {category}
                                                        <ChevronRight className="w-5 h-5 text-neutral-500 group-open:rotate-90 transition-transform" />
                                                    </h3>
                                                    <div className="h-px flex-1 bg-white/10 group-open:bg-white/20 transition-colors"></div>
                                                </summary>
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {events.map(event => {
                                                        const isAlreadyRegistered = existingEventIds.includes(event.id!);
                                                        return (
                                                            <div key={event.id}
                                                                onClick={() => !isAlreadyRegistered && toggleEventSelection(event.id!)}
                                                                className={cn("relative p-5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-full hover:shadow-lg hover:border-red-500/50",
                                                                    formData.paidEventIds?.includes(event.id!) ? "bg-red-900/10 border-red-800 shadow-md ring-1 ring-red-500/20" : "bg-white/5 border-white/10",
                                                                    isAlreadyRegistered && "opacity-50 cursor-not-allowed bg-green-900/10 border-green-800/20"
                                                                )}>

                                                                {/* Event Type Tag */}
                                                                <div className="absolute top-0 right-0">
                                                                    <div className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl border-b border-l",
                                                                        event.maxTeamSize > 1
                                                                            ? "bg-purple-900/30 text-purple-200 border-white/5"
                                                                            : "bg-blue-900/30 text-blue-200 border-white/5"
                                                                    )}>
                                                                        {event.maxTeamSize > 1
                                                                            ? (event.minTeamSize === 1 ? "Team / Solo" : "Team Event")
                                                                            : "Solo Event"}
                                                                    </div>
                                                                </div>

                                                                {/* Selection Tick Override */}
                                                                {formData.paidEventIds?.includes(event.id!) ? (
                                                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-md border-2 border-black z-10">
                                                                        <CheckCircle className="w-5 h-5 text-white" />
                                                                    </div>
                                                                ) : isAlreadyRegistered ? (
                                                                    <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/20 uppercase">
                                                                        Registered
                                                                    </div>
                                                                ) : (
                                                                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-neutral-700 bg-neutral-900 z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                )}

                                                                <div className="mt-4">
                                                                    <div className="flex justify-between items-start mb-2"><div className={cn("text-xs font-bold px-2 py-1 rounded transition-colors border", formData.paidEventIds?.includes(event.id!) ? "bg-red-500/20 text-red-200 border-red-500/20" : "bg-neutral-800 text-neutral-400 border-neutral-700")}>₹100 for participation/person</div></div>
                                                                    <h4 className={cn("font-bold text-neutral-200 mb-2 lg:text-lg group-hover:text-red-400 transition-colors", formData.paidEventIds?.includes(event.id!) && "text-red-400")}>{event.title}</h4>
                                                                    <p className="text-xs text-neutral-400 line-clamp-3 mb-4 leading-relaxed">{event.description}</p>

                                                                    {/* Event Timing & Venue */}
                                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                                        {(event.date || event.time || event.schedule) && (
                                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-200 bg-white/10 px-2 py-1.5 rounded border border-white/10 shadow-sm">
                                                                                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                                                                <span>{event.date ? `${event.date} ${event.time ? `• ${event.time}` : ''}` : event.schedule || 'TBA'}</span>
                                                                            </div>
                                                                        )}
                                                                        {event.venue && (
                                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-200 bg-white/10 px-2 py-1.5 rounded border border-white/10 shadow-sm">
                                                                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                                                <span>{event.venue}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {((event.maxTeamSize > 1) || event.formConfig) && <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3" /> Needs Extra Details</div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* NO REFUND WARNING BANNER */}
                        <div className="bg-red-950/40 border-l-4 border-red-600 p-4 rounded-r-xl flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-red-400 font-bold uppercase tracking-wider text-sm mb-1">Strict No Refund Policy</h3>
                                <p className="text-neutral-300 text-xs leading-relaxed">
                                    Please note that all event registrations are <strong>final and non-refundable</strong>.
                                    Ensure you are available for the event duration before proceeding.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- Step 3: Event Details (Dynamic) --- */}
            {
                !hasPass && hasComplexEvents && currentStep === 3 && (
                    <div className="space-y-8 max-w-3xl mx-auto">
                        <div className="text-center mb-6">
                            <h2 className={cn("text-2xl font-bold text-neutral-200 mb-2", cinzel.className)}>Detailed Information</h2>
                            <p className="text-sm text-neutral-400">Some of your selected events require team or additional details.</p>
                        </div>

                        {complexEvents.map((event) => (
                            <EventRegistrationCard
                                key={event.id}
                                event={event}
                                response={eventResponses[event.id!] || {}}
                                onUpdate={(field: keyof EventResponseData, value: any) => updateEventResponse(event.id!, field, value)}
                                onUpdateCustom={(field: string, value: any) => updateCustomResponse(event.id!, field, value)}
                                onMemberChange={(idx: number, field: string, val: string) => handleMemberChange(event.id!, idx, field as keyof TeamMemberInput, val)}
                                onAddMember={() => addMember(event.id!)}
                                onRemoveMember={(idx: number) => removeMember(event.id!, idx)}
                            />
                        ))}
                    </div>
                )
            }

            {/* --- Step: Payment (Last) --- */}
            {
                !hasPass && currentStep === STEPS.length && (
                    <div className="space-y-6 max-w-lg mx-auto">
                        <div className="text-center mb-6"><h2 className={cn("text-2xl font-bold text-neutral-200 mb-2", cinzel.className)}>Checkout</h2><p className="text-sm text-neutral-400">Review your pass details before payment</p></div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-dashed border-white/10">
                                        <div className="text-left"><div className="font-bold text-white text-sm">Base Registration</div><div className="text-xs text-neutral-500">{formData.collegeType} Student</div></div>
                                        <div className="font-medium text-white">₹{pricing.baseFee}</div>
                                    </div>

                                    {/* Events Breakdown */}
                                    {pricing.eventsBreakdown.length > 0 && (
                                        <div className="space-y-2 pb-4 border-b border-dashed border-white/10">
                                            <div className="font-bold text-white text-sm mb-2">Selected Events</div>
                                            {pricing.eventsBreakdown.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs text-neutral-400">
                                                    <div className="flex items-center">
                                                        {item.title}
                                                    </div>
                                                    <div className="font-medium text-white">₹{item.cost}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Accommodation Breakdown */}
                                    {formData.accommodationRequired && (
                                        <div className="flex justify-between items-center pb-4 border-b border-dashed border-white/10">
                                            <div className="text-left">
                                                <div className="font-bold text-white text-sm">Accommodation</div>
                                                <div className="text-xs text-neutral-500">
                                                    {(Number(formData.numberOfBoys) || 0) + (Number(formData.numberOfGirls) || 0)} Pax x {formData.accommodationDates?.length || 0} Days x ₹500
                                                </div>
                                            </div>
                                            <div className="font-medium text-white">₹{pricing.accommodationFee}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Liability Agreements */}
                                {formData.paidEventIds && formData.paidEventIds.length > 0 && (
                                    <div className="pt-4 border-t border-dashed border-white/10 space-y-3">
                                        <div className="font-bold text-amber-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Mandatory Agreements</div>
                                        {formData.paidEventIds.map(id => {
                                            const event = availableEvents.find(e => e.id === id);
                                            if (!event) return null;
                                            const isTeam = event.maxTeamSize > 1 || event.minTeamSize > 1;
                                            const text = isTeam
                                                ? `If minimum team size is not met, the team is DISQUALIFIED with NO REFUND. I confirm my teammates are ready.`
                                                : `I agree to the strict NO REFUND policy for this event.`;

                                            return (
                                                <div key={id} className="flex gap-3 items-start p-3 bg-red-950/30 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors">
                                                    <Checkbox
                                                        id={`agree-${id}`}
                                                        checked={!!agreements[id]}
                                                        onCheckedChange={(c) => setAgreements(p => ({ ...p, [id]: c === true }))}
                                                        className="mt-0.5 border-red-500/50 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                    />
                                                    <Label htmlFor={`agree-${id}`} className="text-[11px] text-neutral-300 leading-relaxed cursor-pointer select-none">
                                                        <span className="font-bold text-red-400">{event.title}:</span> {text}
                                                    </Label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-2"><div className="text-left"><div className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Total Payable</div></div><div className="text-4xl font-black text-white">₹{pricing.total}</div></div>

                                {/* ⚠️ Industry-standard payment caution banner */}
                                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <span className="text-amber-400 text-lg shrink-0">⚠️</span>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-amber-300">Important — Please Read Before Paying</p>
                                        <ul className="text-xs text-amber-400/80 space-y-1 leading-relaxed list-disc list-inside">
                                            <li>Do <b>NOT</b> close the payment app until you see the success screen.</li>
                                            <li>Do <b>NOT</b> press the back button during payment.</li>
                                            <li>Do <b>NOT</b> refresh this page while payment is in progress.</li>
                                            <li>Wait for the page to redirect automatically after completion.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Navigation (Flow-based, not fixed) */}
            {
                !hasPass && (
                    <div className="mt-6 mb-4 md:mt-12 md:mb-8 max-w-4xl mx-auto flex justify-between items-center px-4 md:px-6 gap-3">
                        <Button
                            onClick={() => currentStep > 1 && setCurrentStep(p => p - 1)}
                            disabled={currentStep === 1 || loading}
                            className={cn(
                                "font-bold rounded-xl shadow-lg transition-all",
                                "px-4 py-3 text-base md:px-8 md:py-6 md:text-lg",
                                currentStep === 1
                                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    : "bg-red-600 text-white hover:bg-red-700 hover:scale-105 shadow-red-500/20"
                            )}
                        >
                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" /> Back
                        </Button>

                        <Button
                            onClick={handleNext}
                            disabled={loading || (currentStep === STEPS.length && (formData.paidEventIds || []).some(id => !agreements[id]))}
                            className={cn(
                                "font-bold rounded-xl shadow-xl shadow-red-500/20 transition-all hover:scale-105",
                                "px-6 py-3 text-base md:px-8 md:py-6 md:text-lg min-w-[140px] md:min-w-[200px]",
                                "bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-500 hover:to-red-700"
                            )}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" /> <span className="hidden md:inline">Verifying...</span><span className="md:hidden">Wait...</span></>
                            ) : (
                                <>
                                    {currentStep === 2 && (!formData.paidEventIds || formData.paidEventIds.length === 0)
                                        ? <><span className="hidden md:inline">Choose Later & Continue</span><span className="md:hidden">Skip</span></>
                                        : currentStep === STEPS.length
                                            ? "Proceed to Pay"
                                            : "Continue"
                                    }
                                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                )
            }

            {/* Success State (Pass Exists) */}
            {
                hasPass && (
                    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 p-4 z-40">
                        <div className="container max-w-md mx-auto">
                            <Button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold h-12 text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform"
                            >
                                Go to Dashboard <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                )
            }

            <div className="h-12" />
        </RoyalFormLayout >
    );
}



'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, COLLECTIONS, UserRegistration, Event, EventFormConfig, EventResponseData } from '@/lib/db';
import { isTeamNameAvailable, verifyTeamId } from '@/lib/team-logic'; // Import logic
import { uploadFile } from '@/lib/storage';
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UploadCloud, ArrowLeft, ArrowRight, AlertCircle, Sparkles, Building2, UserCircle2, MapPin, Users, HelpCircle, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Cinzel } from 'next/font/google';
import { EventRegistrationCard } from '@/components/events/EventRegistrationCard';

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
    const router = useRouter();
    const { user, userProfile } = useAuth();

    // Core State
    const [loading, setLoading] = React.useState(false);
    const [pageLoading, setPageLoading] = React.useState(true);
    const [availableEvents, setAvailableEvents] = React.useState<Event[]>([]);

    // File Upload State
    const [uploading, setUploading] = React.useState<string | null>(null);
    const photoInputRef = React.useRef<HTMLInputElement>(null);
    const idInputRef = React.useRef<HTMLInputElement>(null);

    // Form Data - Main Profile
    const [formData, setFormData] = React.useState<Partial<UserRegistration>>({
        fullName: '', mobileNumber: '', email: '', gender: '', photoUrl: '',
        collegeType: 'OTHER', regNo: '', collegeName: '', degreeBranch: '', yearOfStudy: '', cityState: '', idCardUrl: '',
        accommodationRequired: false, arrivalDate: '', departureDate: '', numberOfDays: 0, numberOfBoys: 0, numberOfGirls: 0,
        paidEventIds: [], aftCoins: 0, registrationType: 'Individual', completed: false
    });

    const [city, setCity] = React.useState('');
    const [state, setState] = React.useState('');

    // --- Dynamic Event Data State ---
    const [eventResponses, setEventResponses] = React.useState<Record<string, EventResponseData>>({});

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

                try {
                    const docSnap = await getDoc(doc(db, COLLECTIONS.REGISTRATIONS, user.uid));
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserRegistration;
                        if (data.completed) {
                            // toast.success("Already registered!"); // Silent redirect in prod usually
                            // router.replace('/register/success'); 
                            // Allow re-entry for testing or viewing
                        }
                        setFormData(prev => ({ ...prev, ...data }));
                        if (data.cityState) {
                            const [c, s] = data.cityState.split(',').map(s => s.trim());
                            setCity(c || ''); setState(s || '');
                        }
                    }
                } catch (e) { console.error(e); }
            }
        };

        const fetchEvents = async () => {
            try {
                const q = query(collection(db, 'events'), orderBy('title', 'asc'));
                const snap = await getDocs(q);
                const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)).filter(e => e.category !== 'Flagship');
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
            return updates;
        });
    };

    // Deferred Upload Logic
    const handleFilePreview = (file: File, field: 'idCardUrl' | 'photoUrl') => {
        if (file.size > 5 * 1024 * 1024) { toast.error("File size must be < 5MB"); return; }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Store in LocalStorage for persistence across reloads
            try {
                localStorage.setItem(`draft_${field}`, result);
            } catch (e) {
                console.warn("Could not save draft to local storage (likely size limit)", e);
            }
            // Update State
            handleInputChange(field, result);
        };
        reader.readAsDataURL(file);
    };

    // Restore drafts on mount
    React.useEffect(() => {
        const photoDraft = localStorage.getItem('draft_photoUrl');
        const idDraft = localStorage.getItem('draft_idCardUrl');
        if (photoDraft && !formData.photoUrl) handleInputChange('photoUrl', photoDraft);
        if (idDraft && !formData.idCardUrl) handleInputChange('idCardUrl', idDraft);
    }, []);

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
            const pax = (Number(formData.numberOfBoys) || 0) + (Number(formData.numberOfGirls) || 0);
            const days = formData.accommodationDates?.length || 0;
            accommodationFee = pax * days * 500;
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
                if ((Number(formData.numberOfBoys) || 0) + (Number(formData.numberOfGirls) || 0) === 0) return "Please specify number of people for accommodation";
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
                    }
                } else if (event.formConfig?.askTeamName && !resp.teamName) {
                    // Fallback for events that just ask Name without strict Logic
                    return `Team Name required for ${event.title}`;
                }

                if (event.formConfig?.askPptUrl && !resp.customResponses?.pptUrl) return `PPT URL required for ${event.title}`;
                if (event.formConfig?.customFields) {
                    for (const f of event.formConfig.customFields) if (f.required && !resp.customResponses?.[f.id]) return `${f.label} is required`;
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
            // --- 0. Upload Images if Base64 ---
            let finalPhotoUrl = formData.photoUrl;
            let finalIdCardUrl = formData.idCardUrl;

            const uploadBase64 = async (base64Data: string, field: string) => {
                // Convert Base64 to Blob
                const res = await fetch(base64Data);
                const blob = await res.blob();
                const file = new File([blob], `${field}.jpg`, { type: 'image/jpeg' });
                return await uploadFile(file, user.uid, field, field === 'idCardUrl' ? 'id_cards' : 'profiles', 'image');
            };

            if (finalPhotoUrl?.startsWith('data:')) {
                toast.info("Uploading Profile Photo...");
                finalPhotoUrl = await uploadBase64(finalPhotoUrl, 'photoUrl');
            }
            if (finalIdCardUrl?.startsWith('data:')) {
                toast.info("Uploading ID Card...");
                finalIdCardUrl = await uploadBase64(finalIdCardUrl, 'idCardUrl');
            }

            // 1. Save Main Registration
            const finalData: UserRegistration = {
                ...formData as UserRegistration,
                photoUrl: finalPhotoUrl!,
                idCardUrl: finalIdCardUrl!,
                userId: user.uid,
                email: user.email!,
                completed: true,
                createdAt: serverTimestamp(),
                aftCoins: 0,
                hasEntryPass: false, // Wait for Payment Success
                hasHackathonPass: false,
                paidEventIds: formData.paidEventIds || [],
                cityState: `${city}, ${state}`
            };
            await setDoc(doc(db, COLLECTIONS.REGISTRATIONS, user.uid), finalData);
            await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                mobileNumber: finalData.mobileNumber, collegeName: finalData.collegeName,
                idCardUrl: finalData.idCardUrl, photoUrl: finalData.photoUrl, regNo: finalData.regNo, isOnboarded: true
            }, { merge: true });

            // Clear Drafts
            localStorage.removeItem('draft_photoUrl');
            localStorage.removeItem('draft_idCardUrl');

            // 2. Save Complex Event Registrations (Sub-collection)
            for (const event of complexEvents) {
                const resp = eventResponses[event.id!];
                if (!resp) continue;

                const regPayload = {
                    eventId: event.id,
                    userId: user.uid,
                    paymentStatus: 'pending',
                    status: 'active',
                    userSnapshot: {
                        fullName: formData.fullName,
                        regNo: formData.regNo,
                        mobileNumber: formData.mobileNumber,
                        email: formData.email
                    },
                    responses: {
                        teamName: resp.teamName,
                        ...resp.customResponses
                    },
                    teamMembers: resp.isTeamLeader ? resp.teamMembers : [],
                    role: resp.isTeamLeader ? 'Leader' : 'Member',
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'events', event.id!, 'registrations'), regPayload);
            }

            // --- 3. Initiate Payment (Paytm) ---
            const orderId = `ORD_${user.uid}_${Date.now()}`;
            const amount = pricing.total.toString();

            const response = await fetch('/api/paytm/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            const data = await response.json();

            if (!data.success || !data.txnToken) {
                throw new Error(data.message || "Failed to initiate payment");
            }

            // --- 4. Redirect to Paytm Gateway ---
            // Constructing a temporary form to submit to Paytm
            // URL Structure: https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid={mid}&orderId={orderId}
            const mid = data.mid;
            const txnToken = data.txnToken;

            // NOTE: Using Staging URL as per UI text. Change to securegw.paytm.in for PROD.
            const paytmUrl = `https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderId}`;

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = paytmUrl;

            const midInput = document.createElement('input');
            midInput.type = 'hidden';
            midInput.name = 'mid';
            midInput.value = mid;
            form.appendChild(midInput);

            const orderIdInput = document.createElement('input');
            orderIdInput.type = 'hidden';
            orderIdInput.name = 'orderId';
            orderIdInput.value = orderId;
            form.appendChild(orderIdInput);

            const txnTokenInput = document.createElement('input');
            txnTokenInput.type = 'hidden';
            txnTokenInput.name = 'txnToken';
            txnTokenInput.value = txnToken;
            form.appendChild(txnTokenInput);

            document.body.appendChild(form);
            form.submit();

            // Prevent redirecting manually, let the form submit take over
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
        availableEvents.forEach(e => {
            const cat = e.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(e);
        });
        return grouped;
    }, [availableEvents]);

    return (
        <RoyalFormLayout
            title="Aadhrita Registration"
            subtitle="Join a Legacy Reawakened"
            showStep={true} currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS}
            backgroundImage="/bg-onboarding.webp"
        >
            {/* --- Step 1: Identity & Stay --- */}
            {currentStep === 1 && (
                <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                    {/* Identity Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
                        <h2 className={cn("text-lg font-bold text-gray-900 mb-6 flex items-center gap-2", cinzel.className)}>
                            <UserCircle2 className="w-5 h-5 text-red-600" /> Identity Details
                        </h2>
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-6">
                            <div className="shrink-0 flex flex-col items-center">
                                {/* Photo Upload Refactored: Base64 Preview Only */}
                                <div onClick={() => photoInputRef.current?.click()} className={cn("w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-50 flex items-center justify-center relative group cursor-pointer transition-all hover:border-red-100", !formData.photoUrl && "border-dashed border-gray-300")}>
                                    {formData.photoUrl ? <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : (uploading === 'photoUrl' ? <Loader2 className="w-8 h-8 text-red-500 animate-spin" /> : <UserCircle2 className="w-16 h-16 text-gray-300" />)}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white"><UploadCloud className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold uppercase">Change</span></div>
                                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFilePreview(e.target.files[0], 'photoUrl')} />
                                </div>
                                <span className="text-xs text-gray-500 mt-2 font-medium">Profile Photo *</span>
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-[10px] text-yellow-800 text-center max-w-[150px]">
                                    <span className="font-bold block mb-1">IMPORTANT</span>
                                    Face must be clear. This will be used for Security Verification.
                                </div>
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div><Label className="text-gray-700 font-semibold text-sm">Full Name <span className="text-red-500">*</span></Label><Input className="bg-gray-50 text-gray-900 border-gray-200 mt-1" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} placeholder="As per Official Records" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label className="text-gray-700 font-semibold text-sm">WhatsApp No. <span className="text-red-500">*</span></Label><Input type="tel" className="bg-gray-50 text-gray-900 border-gray-200 mt-1" value={formData.mobileNumber} onChange={(e) => handleInputChange('mobileNumber', e.target.value)} placeholder="+91" /></div>
                                    <div><Label className="text-gray-700 font-semibold text-sm">Gender <span className="text-red-500">*</span></Label><Select value={formData.gender} onValueChange={(val) => handleInputChange('gender', val)}><SelectTrigger className="bg-gray-50 border-gray-200 mt-1 text-gray-900"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Academic Section */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className={cn("text-lg font-bold text-gray-900 mb-6 flex items-center gap-2", cinzel.className)}><Building2 className="w-5 h-5 text-red-600" /> Academic & College Details</h2>
                        <div className="space-y-5">
                            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100"><Label className="text-gray-900 font-bold mb-3 block">Are you from MVGR College?</Label><RadioGroup value={formData.collegeType} onValueChange={(val) => handleInputChange('collegeType', val)} className="flex gap-6"><div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm"><RadioGroupItem value="MVGR" id="mvgr-yes" className="text-red-600" /><Label htmlFor="mvgr-yes" className="text-gray-800 font-medium cursor-pointer">Yes, MVGR Student</Label></div><div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"><RadioGroupItem value="OTHER" id="mvgr-no" className="text-gray-500" /><Label htmlFor="mvgr-no" className="text-gray-700 font-medium cursor-pointer">No, Other College</Label></div></RadioGroup></div>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-1"><Label className="text-gray-700 font-semibold text-sm">College Name <span className="text-red-500">*</span></Label><Input className={cn("bg-gray-50 text-gray-900 border-gray-200", formData.collegeType === 'MVGR' && "opacity-80")} value={formData.collegeName} onChange={(e) => handleInputChange('collegeName', e.target.value)} disabled={formData.collegeType === 'MVGR'} /></div>
                                <div className="space-y-1"><Label className="text-gray-700 font-semibold text-sm">Reg / Roll Number <span className="text-red-500">*</span></Label><Input className="bg-gray-50 text-gray-900 border-gray-200 uppercase tracking-widest font-mono" value={formData.regNo} onChange={(e) => handleInputChange('regNo', e.target.value.toUpperCase())} placeholder={formData.collegeType === 'MVGR' ? "21331A05..." : "University ID"} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1"><Label className="text-gray-700 font-semibold text-sm">Branch <span className="text-red-500">*</span></Label><Input className="bg-gray-50 text-gray-900" placeholder="e.g. CSE" value={formData.degreeBranch} onChange={(e) => handleInputChange('degreeBranch', e.target.value)} /></div>
                                <div className="space-y-1"><Label className="text-gray-700 font-semibold text-sm">Year <span className="text-red-500">*</span></Label><Select value={formData.yearOfStudy} onValueChange={(val) => handleInputChange('yearOfStudy', val)}><SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{[1, 2, 3, 4].map(y => <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1"><Label className="text-gray-700 font-semibold text-sm">City <span className="text-red-500">*</span></Label><Input className={cn("bg-gray-50 text-gray-900 border-gray-200", formData.collegeType === 'MVGR' && "opacity-80")} value={city} onChange={(e) => setCity(e.target.value)} disabled={formData.collegeType === 'MVGR'} placeholder="Town/City" /></div>
                                <div className="space-y-1"><Label className="text-gray-700 font-semibold text-sm">State <span className="text-red-500">*</span></Label><Input list="indian-states" className={cn("bg-gray-50 text-gray-900 border-gray-200", formData.collegeType === 'MVGR' && "opacity-80")} value={state} onChange={(e) => setState(e.target.value)} disabled={formData.collegeType === 'MVGR'} placeholder="Type to search..." /><datalist id="indian-states">{INDIAN_STATES.map((s) => (<option key={s} value={s} />))}</datalist></div>
                            </div>
                            <div className="pt-2"><Label className="text-gray-700 font-semibold text-sm mb-2 block">College ID Card <span className="text-red-500">*</span></Label><div className={cn("border-2 border-dashed border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors text-center relative", !formData.idCardUrl && "bg-gray-50")}>{formData.idCardUrl ? (<div className="relative group"><img src={formData.idCardUrl} className="h-32 mx-auto rounded-lg object-contain shadow-sm" alt="ID" /><div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Button variant="outline" size="sm" onClick={() => handleInputChange('idCardUrl', '')}>Change File</Button></div></div>) : (<div onClick={() => idInputRef.current?.click()} className="flex flex-col items-center py-3 cursor-pointer group">{uploading === 'idCardUrl' ? (<Loader2 className="w-8 h-8 text-red-600 animate-spin" />) : (<UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-red-500 transition-colors" />)}<span className="text-xs text-gray-500 mt-2 font-medium">Click to upload image</span><input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFilePreview(e.target.files[0], 'idCardUrl')} disabled={uploading === 'idCardUrl'} /></div>)}</div></div>
                        </div>
                    </div>

                    {/* Accommodation Section Refactored */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className={cn("text-lg font-bold text-gray-900 mb-6 flex items-center gap-2", cinzel.className)}>
                            <Building2 className="w-5 h-5 text-red-600" /> Accommodation (Optional)
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <Checkbox
                                    id="acc-required"
                                    checked={formData.accommodationRequired}
                                    onCheckedChange={(c) => handleInputChange('accommodationRequired', c === true)}
                                    className="mt-1"
                                />
                                <div>
                                    <Label htmlFor="acc-required" className="text-gray-900 font-bold block cursor-pointer">
                                        I need Accommodation & Food
                                    </Label>
                                    <p className="text-sm text-gray-600 mt-1">
                                        <span className="font-bold text-amber-700">₹500 per person / day</span>.
                                    </p>
                                </div>
                            </div>

                            {formData.accommodationRequired && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {/* Date Selection */}
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold text-sm">Select Dates</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['25-02-2026', '26-02-2026', '27-02-2026'].map((date) => (
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
                                                        "cursor-pointer border-2 rounded-xl p-3 text-center transition-all",
                                                        formData.accommodationDates?.includes(date)
                                                            ? "bg-amber-100 border-amber-500 text-amber-900 shadow-sm"
                                                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-300"
                                                    )}
                                                >
                                                    <div className="text-xs font-bold uppercase">{new Date(date.split('-').reverse().join('-')).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                                                    <div className="text-[10px] opacity-70">12PM - 12PM</div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            *Early check-in (Feb 25th before 12 PM)? <a href="tel:+91XXXXXXXXXX" className="text-blue-600 underline">Contact Us</a>.
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <Label className="text-gray-700 font-semibold text-sm">Male Count</Label>
                                            <Input type="number" min="0" className="bg-gray-50 text-gray-900 border-gray-200" value={formData.numberOfBoys} onChange={(e) => handleInputChange('numberOfBoys', parseInt(e.target.value) || 0)} placeholder="0" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-gray-700 font-semibold text-sm">Female Count</Label>
                                            <Input type="number" min="0" className="bg-gray-50 text-gray-900 border-gray-200" value={formData.numberOfGirls} onChange={(e) => handleInputChange('numberOfGirls', parseInt(e.target.value) || 0)} placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Step 2: Events --- */}
            {currentStep === 2 && (
                <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="text-center mb-6"><h2 className={cn("text-2xl font-bold text-gray-900 mb-2", cinzel.className)}>Select Your Events</h2><p className="text-sm text-gray-500">Add paid events to your pass (₹100 each). You can also add these later!</p></div>
                    {pageLoading ? (<div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-red-600" /></div>) : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                {Object.entries(eventsByCategory).map(([category, events]) => (
                                    <details key={category} className="group open:mb-8 transition-all" open>
                                        <summary className="flex items-center gap-4 cursor-pointer list-none select-none mb-4 group-open:mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                {category}
                                                <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                                            </h3>
                                            <div className="h-px flex-1 bg-gray-200 group-open:bg-gray-300 transition-colors"></div>
                                        </summary>

                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                            {events.map(event => (
                                                <div key={event.id} onClick={() => toggleEventSelection(event.id!)} className={cn("relative p-5 rounded-xl border-2 transition-all cursor-pointer group flex flex-col justify-between h-full hover:shadow-lg", formData.paidEventIds?.includes(event.id!) ? "bg-red-50 border-red-600 shadow-md ring-1 ring-red-500/20" : "bg-white border-zinc-800 hover:border-red-500")}>

                                                    {/* Event Type Tag */}
                                                    <div className="absolute top-0 right-0">
                                                        <div className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl border-b-2 border-l-2",
                                                            event.maxTeamSize > 1
                                                                ? "bg-purple-100 text-purple-900 border-white"
                                                                : "bg-blue-100 text-blue-900 border-white"
                                                        )}>
                                                            {event.maxTeamSize > 1
                                                                ? (event.minTeamSize === 1 ? "Team / Solo" : "Team Event")
                                                                : "Solo Event"}
                                                        </div>
                                                    </div>

                                                    {/* Selection Tick Override */}
                                                    {formData.paidEventIds?.includes(event.id!) ? (
                                                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in spin-in-12 duration-300 border-2 border-white z-10">
                                                            <CheckCircle className="w-5 h-5 text-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-gray-300 bg-white z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}

                                                    <div className="mt-4">
                                                        <div className="flex justify-between items-start mb-2"><div className={cn("text-xs font-bold px-2 py-1 rounded transition-colors border", formData.paidEventIds?.includes(event.id!) ? "bg-red-100 text-red-900 border-red-200" : "bg-zinc-100 text-zinc-600 border-zinc-200")}>₹100 for participation/person</div></div>
                                                        <h4 className={cn("font-bold text-gray-900 mb-2 text-lg group-hover:text-red-700 transition-colors", formData.paidEventIds?.includes(event.id!) && "text-red-700")}>{event.title}</h4>
                                                        <p className="text-xs text-stone-500 line-clamp-3 mb-4 leading-relaxed">{event.description}</p>
                                                        {((event.maxTeamSize > 1) || event.formConfig) && <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3" /> Needs Extra Details</div>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- Step 3: Event Details (Dynamic) --- */}
            {hasComplexEvents && currentStep === 3 && (
                <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="text-center mb-6">
                        <h2 className={cn("text-2xl font-bold text-gray-900 mb-2", cinzel.className)}>Detailed Information</h2>
                        <p className="text-sm text-gray-500">Some of your selected events require team or additional details.</p>
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
            )}

            {/* --- Step: Payment (Last) --- */}
            {currentStep === STEPS.length && (
                <div className="space-y-6 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-6"><h2 className={cn("text-2xl font-bold text-gray-900 mb-2", cinzel.className)}>Checkout</h2><p className="text-sm text-gray-500">Review your pass details before payment</p></div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200">
                                    <div className="text-left"><div className="font-bold text-gray-900 text-sm">Base Registration</div><div className="text-xs text-gray-500">{formData.collegeType} Student</div></div>
                                    <div className="font-medium text-gray-900">₹{pricing.baseFee}</div>
                                </div>

                                {/* Events Breakdown */}
                                {pricing.eventsBreakdown.length > 0 && (
                                    <div className="space-y-2 pb-4 border-b border-dashed border-gray-200">
                                        <div className="font-bold text-gray-900 text-sm mb-2">Selected Events</div>
                                        {pricing.eventsBreakdown.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs text-gray-600">
                                                <div className="flex items-center">
                                                    {item.title}
                                                </div>
                                                <div className="font-medium text-gray-900">₹{item.cost}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Accommodation Breakdown */}
                                {formData.accommodationRequired && (
                                    <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200">
                                        <div className="text-left">
                                            <div className="font-bold text-gray-900 text-sm">Accommodation</div>
                                            <div className="text-xs text-gray-500">
                                                {(Number(formData.numberOfBoys) || 0) + (Number(formData.numberOfGirls) || 0)} Pax x {formData.accommodationDates?.length || 0} Days x ₹500
                                            </div>
                                        </div>
                                        <div className="font-medium text-gray-900">₹{pricing.accommodationFee}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-end pt-2"><div className="text-left"><div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Payable</div></div><div className="text-4xl font-black text-gray-900">₹{pricing.total}</div></div>
                        </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" /><div className="text-sm text-yellow-800"><p className="font-bold mb-1">Testing Mode</p><p>Payment gateway is in sandbox mode. No actual money will be deducted.</p></div></div>
                </div>
            )}

            {/* Navigation (Flow-based, not fixed) */}
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
                    disabled={loading}
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

            <div className="h-12" />
        </RoyalFormLayout >
    );
}

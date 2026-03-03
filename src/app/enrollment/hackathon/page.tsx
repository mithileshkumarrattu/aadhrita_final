'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, HackathonTeam } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { safeStorage } from '@/lib/utils'; // Updated helper
import { RoyalFormLayout } from '@/components/layout/RoyalFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UploadCloud, FileText, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CoinLoader } from '@/components/ui/CoinLoader';

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];
const MAX_FILE_SIZE_MB = 20;

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

const COMMUNICATION_CHANNELS = ["WhatsApp", "Email", "Phone Call", "Telegram"];
const REFERRAL_SOURCES = ["Social Media (Instagram/LinkedIn)", "Friends/Peers", "College Faculty", "WhatsApp Group", "Posters/Flyers", "Other"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;


const STEPS = [
    { id: 1, title: 'Instructions' },
    { id: 2, title: 'Team Info' },
    { id: 3, title: 'College' },
    { id: 4, title: 'Lead & Members' },
    { id: 5, title: 'PPT & Final' }
];

interface Member {
    name: string;
    regNo: string;
    dept: string;
    year: string;
    email: string;
    phone: string;
    idCardUrl: string;
}

// --- Helper Components ---

const InputField = ({ label, section, field, placeholder, type = "text", required = true, formData, updateField, ...props }: any) => {
    const value = section === 'root' ? (formData as any)[field] : (formData as any)[section][field];
    return (
        <div className="space-y-1">
            <Label className="text-neutral-300 font-semibold text-sm">{label} {required && <span className="text-red-500">*</span>}</Label>
            <Input
                type={type}
                placeholder={placeholder}
                className="bg-black/50 border-white/10 text-white placeholder:text-neutral-500 focus:border-red-500/50 focus:ring-red-500/20"
                value={value}
                onChange={e => updateField(section, field, e.target.value)}
                {...props}
            />
        </div>
    );
};

const IdUpload = ({ section, label, formData, updateField, handleFileSelect }: any) => {
    const fileUrl = (formData as any)[section].idCardUrl;

    return (
        <div className="space-y-2">
            <Label className="text-neutral-300 font-semibold text-sm">{label} Upload <span className="text-red-500">*</span></Label>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors relative bg-black/30">
                {fileUrl ? (
                    <div className="text-center w-full">
                        <img src={fileUrl} alt="ID" className="h-20 object-contain mx-auto mb-2 rounded shadow-sm" />
                        <p className="text-xs text-green-400 font-bold mb-1">✓ Selected</p>
                        <Button size="sm" variant="outline" className="h-6 text-xs border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white" onClick={() => updateField(section, 'idCardUrl', '')}>Change</Button>
                    </div>
                ) : (
                    <>
                        <UploadCloud className="w-6 h-6 text-neutral-500" />
                        <span className="text-xs text-neutral-500">Click to Select Image</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], section + '-id', [section, 'idCardUrl'])}
                        />
                    </>
                )}
            </div>
        </div>
    );
};



export default function HackathonEnrollmentPage() {
    const router = useRouter();
    const { user, loading: authLoading, googleLogin } = useAuth();
    const [currentStep, setCurrentStep] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const [checkingRegistration, setCheckingRegistration] = React.useState(true);
    const [uploading, setUploading] = React.useState<string | null>(null); // Track which file is uploading
    const [files, setFiles] = React.useState<Record<string, File>>({}); // Store raw files

    // Check for existing registration
    React.useEffect(() => {
        const checkExisting = async () => {
            if (!user) return;
            try {
                // Check reg_hackathon (COLLECTIONS.HACKATHON)
                const docRef = doc(db, COLLECTIONS.HACKATHON, user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Only block re-entry if payment was confirmed (avoid locking out on draft/pending docs)
                    if (data?.paymentStatus === 'paid' || data?.status === 'approved') {
                        toast.success("You are already registered!");
                        router.replace('/enrollment/hackathon/success');
                        return;
                    }
                    // Otherwise: doc exists but pending — let form reopen (user can resubmit)
                }
            } catch (error) {
                console.error("Error checking registration:", error);
            } finally {
                setCheckingRegistration(false);
            }
        };

        if (user) {
            checkExisting();
        } else if (!authLoading) {
            setCheckingRegistration(false);
        }
    }, [user, router, authLoading]);

    // Restore Drafts
    React.useEffect(() => {
        const restoreDraft = (section: string) => {
            const draft = safeStorage.getItem(`hack_draft_${section}_idCardUrl`);
            if (draft) {
                setFormData(prev => {
                    // @ts-ignore
                    const member = prev[section];
                    return { ...prev, [section]: { ...member, idCardUrl: draft } };
                });
            }
        };

        restoreDraft('lead');
        restoreDraft('member2');
        restoreDraft('member3');
        restoreDraft('member4');
    }, []);

    const [formData, setFormData] = React.useState({
        // Consent
        readInstructions: false,
        agreedToRules: false,
        declaredOriginality: false,

        // Team
        teamName: '',
        teamSize: '2', // stored as string for select, convert to number later

        // College
        collegeName: '',
        collegeCity: '',
        collegeState: '',

        // Lead (Member 1)
        lead: { name: '', regNo: '', dept: '', year: '', email: '', phone: '', idCardUrl: '' } as Member,

        // Members
        member2: { name: '', regNo: '', dept: '', year: '', email: '', phone: '', idCardUrl: '' } as Member,
        member3: { name: '', regNo: '', dept: '', year: '', email: '', phone: '', idCardUrl: '' } as Member,
        member4: { name: '', regNo: '', dept: '', year: '', email: '', phone: '', idCardUrl: '' } as Member,

        // PPT
        pptTitle: '',
        pptUrl: '',
        usedTemplate: false,

        // Logistics
        participatedBefore: 'no',
        communicationChannel: '',
        emergencyContact: '',
        referralSource: ''
    });

    if (authLoading || checkingRegistration) {
        return <div className="min-h-screen flex items-center justify-center bg-black"><CoinLoader /></div>;
    }

    // --- Handlers ---


    // --- Handlers ---
    const updateField = (section: string, field: string, value: any) => {
        if (section === 'root') {
            setFormData(prev => ({ ...prev, [field]: value }));
        } else {
            // @ts-ignore
            setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
        }
    };

    const handleFileSelect = (file: File, context: string, fieldPath: [string, string]) => {
        const isPPT = context === 'ppt';

        // 1. PPT Handling (Keep as File, No LocalStorage due to size)
        if (isPPT) {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                toast.error("Invalid file type. Only PDF and PPT/PPTX allowed.");
                return;
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast.error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
                return;
            }
            setFiles(prev => ({ ...prev, [context]: file }));
            const previewUrl = URL.createObjectURL(file); // Just for UI state
            updateField(fieldPath[0], fieldPath[1], previewUrl);
            toast.success("PPT Selected");
            return;
        }

        // 2. ID Card Handling (Base64 + LocalStorage)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("ID Card must be < 5MB");
            return;
        }

        toast.loading('Processing image...', { id: 'compress_image' });
        const img = new window.Image();
        const objectUrl = window.URL.createObjectURL(file);
        img.onload = () => {
            window.URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > 1024) { height = Math.round((height * 1024) / width); width = 1024; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if(ctx) ctx.drawImage(img, 0, 0, width, height);
            const result = canvas.toDataURL('image/jpeg', 0.7);
            toast.dismiss('compress_image');
            try { safeStorage.setItem('hack_draft_' + fieldPath[0] + '_idCardUrl', result); } catch (e) { console.warn('LocalStorage quota exceeded'); }
            updateField(fieldPath[0], fieldPath[1], result);
            toast.success('ID Card Selected');
        };
        img.onerror = () => {
            window.URL.revokeObjectURL(objectUrl);
            toast.dismiss('compress_image');
            toast.error('Failed to process image.');
        };
        img.src = objectUrl;
    };

    const validateStep = (step: number) => {
        const d = formData;
        switch (step) {
            case 1:
                // Checkbox removed as per request
                return null;
            case 2:
                if (!d.teamName.trim()) return "Team Name is required.";
                if (d.teamName.trim().length < 4) return "Team Name must be at least 4 characters.";
                return null;
            case 3:
                if (!d.collegeName.trim()) return "College Name is required.";
                if (d.collegeName.trim().length < 4) return "College Name must be at least 4 characters.";
                if (!d.collegeCity.trim()) return "City is required.";
                if (d.collegeCity.trim().length < 2) return "City Name must be at least 2 characters."; // City can be short sometimes
                if (!d.collegeState) return "State is required.";
                return null;
            case 4:
                const validateMember = (m: Member, role: string) => {
                    if (!m.name.trim()) return `${role} Name is required.`;
                    if (m.name.trim().length < 4) return `${role} Name must be at least 4 characters.`;
                    if (!m.regNo.trim()) return `${role} Registration Number is required.`;
                    if (!m.dept.trim()) return `${role} Department is required.`;
                    if (m.dept.trim().length < 2) return `${role} Department must be at least 2 characters.`;
                    if (!m.year.trim()) return `${role} Year is required.`;
                    if (!m.email.trim() || !EMAIL_REGEX.test(m.email)) return `Invalid Email for ${role}.`;
                    if (!m.phone.trim() || !PHONE_REGEX.test(m.phone)) return `Invalid Mobile Number (10 digits) for ${role}.`;
                    if (!m.idCardUrl) return `${role} ID Card is required.`;
                    return null;
                };

                const lErr = validateMember(d.lead, "Team Lead");
                if (lErr) return lErr;

                const m2Err = validateMember(d.member2, "Member 2");
                if (m2Err) return m2Err;

                if (parseInt(d.teamSize) >= 3) {
                    const m3Err = validateMember(d.member3, "Member 3");
                    if (m3Err) return m3Err;
                }

                if (parseInt(d.teamSize) >= 4) {
                    const m4Err = validateMember(d.member4, "Member 4");
                    if (m4Err) return m4Err;
                }
                return null;
            case 5:
                if (!d.pptTitle) return "PPT Title required.";
                if (d.pptTitle.trim().length < 4) return "PPT Title must be at least 4 characters.";
                if (!d.pptUrl) return "PPT File upload is required.";
                if (!d.usedTemplate) return "Please confirm use of official template.";
                if (!d.communicationChannel) return "Select a communication channel.";
                if (!d.emergencyContact || !PHONE_REGEX.test(d.emergencyContact)) return "Valid Emergency Contact required.";
                if (!d.referralSource) return "Select how you heard about us.";
                return null;
            default: return null;
        }
    };

    const handleNext = () => {
        const error = validateStep(currentStep);
        if (error) {
            toast.error(error);
            return;
        }
        if (currentStep < STEPS.length) setCurrentStep(p => p + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        if (!user) {
            toast.error("You must be logged in.");
            return;
        }
        setLoading(true);
        toast.info("Uploading files and submitting...");

        try {
            // 1. Upload Files
            const uploadedUrls: Record<string, string> = {};
            const teamPrefix = formData.teamName ? `${formData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
            console.log(">> UPLOAD START: TeamName=", formData.teamName, "Prefix=", teamPrefix);

            // A. Upload PPT (From File State)
            if (files['ppt']) {
                const file = files['ppt'];
                const nameForFile = formData.pptTitle || 'presentation';
                // Sanitize and construct final name
                const sanitizedTeamName = formData.teamName ? formData.teamName.replace(/[^a-zA-Z0-9]/g, '_') : 'Team';
                const sanitizedTitle = nameForFile.replace(/[^a-zA-Z0-9]/g, '_');
                const finalName = `${sanitizedTeamName}_${sanitizedTitle}`;
                console.log(">> Uploading PPT as:", finalName);

                // Create a new File with the prefixed name to ensure Cloudinary picks it up (if use_filename is on)
                const fileExtension = file.name.split('.').pop() || 'pptx';
                const renamedFile = new File([file], `${finalName}.${fileExtension}`, { type: file.type });

                try {
                    const url = await uploadFile(renamedFile, user.uid, finalName, 'hackathon_ppts', 'raw');
                    uploadedUrls['ppt'] = url;
                } catch (err) {
                    throw new Error("Failed to upload PPT");
                }
            }

            // B. Upload ID Cards (From Base64 in FormData)
            const uploadMemberId = async (memberKey: string, memberData: Member) => {
                if (memberData.idCardUrl?.startsWith('data:')) {
                    const blob = await (await fetch(memberData.idCardUrl)).blob();

                    // Sanitize Names
                    const sanitizedTeamName = formData.teamName ? formData.teamName.replace(/[^a-zA-Z0-9]/g, '_') : 'Team';
                    const sanitizedMemberName = memberData.name ? memberData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Member';
                    // Include memberKey (lead, member2, etc) to guarantee uniqueness even if names are same
                    const finalName = `${sanitizedTeamName}_${memberKey}_${sanitizedMemberName}_ID`;
                    console.log(`>> Uploading ${memberKey} ID as:`, finalName);

                    // Create File with Custom Name
                    const file = new File([blob], `${finalName}.jpg`, { type: "image/jpeg" });

                    return await uploadFile(file, user.uid, finalName, 'hackathon_ids', 'image');
                }
                return memberData.idCardUrl; // Keep existing if not changed
            };

            const leadIdUrl = await uploadMemberId('lead', formData.lead);
            const m2IdUrl = await uploadMemberId('member2', formData.member2);
            // Optional members
            let m3IdUrl = '';
            let m4IdUrl = '';
            if (parseInt(formData.teamSize) >= 3) m3IdUrl = await uploadMemberId('member3', formData.member3);
            if (parseInt(formData.teamSize) >= 4) m4IdUrl = await uploadMemberId('member4', formData.member4);

            // 2. Construct Payload with *Real* URLs
            const getRealUrl = (context: string, currentUrl: string) => {
                // If we uploaded a new file, use that. Else if it's already a remote url (checking logic), use it. 
                // Since we used blob urls for preview, we MUST have an uploaded url for new files.
                // Simplified: If in uploadedUrls, use it. Else check if it looks like a blob, if so -> error? 
                // Actually, if a user didn't change a file (edit mode?), we might keep old URL. 
                // But this is enrollment, so it's all new.
                return uploadedUrls[context] || currentUrl;
            };

            const finalMember2 = { ...formData.member2, idCardUrl: m2IdUrl || formData.member2.idCardUrl };
            const finalMember3 = { ...formData.member3, idCardUrl: m3IdUrl || formData.member3.idCardUrl };
            const finalMember4 = { ...formData.member4, idCardUrl: m4IdUrl || formData.member4.idCardUrl };
            const finalLead = { ...formData.lead, idCardUrl: leadIdUrl || formData.lead.idCardUrl };
            const finalPptUrl = uploadedUrls['ppt'] || formData.pptUrl;

            // Clear Drafts
            safeStorage.removeItem('hack_draft_lead_idCardUrl');
            safeStorage.removeItem('hack_draft_member2_idCardUrl');
            safeStorage.removeItem('hack_draft_member3_idCardUrl');
            safeStorage.removeItem('hack_draft_member4_idCardUrl');

            const membersList = [finalMember2];
            if (parseInt(formData.teamSize) >= 3) membersList.push(finalMember3);
            if (parseInt(formData.teamSize) >= 4) membersList.push(finalMember4);

            const payload: HackathonTeam = {
                teamName: formData.teamName,
                teamSize: parseInt(formData.teamSize),
                collegeName: formData.collegeName,
                collegeCity: formData.collegeCity,
                collegeState: formData.collegeState,
                leader: finalLead,
                members: membersList,
                pptUrl: finalPptUrl,
                pptTitle: formData.pptTitle,
                agreedToRules: formData.agreedToRules,
                declaredOriginality: formData.declaredOriginality,
                previousParticipation: formData.participatedBefore === 'yes',
                communicationChannel: formData.communicationChannel,
                emergencyContact: formData.emergencyContact,
                referralSource: formData.referralSource,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, COLLECTIONS.HACKATHON, user.uid), payload);
            router.push('/enrollment/hackathon/success');
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Enrollment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Components moved outside to fix focus issues

    return (
        <RoyalFormLayout
            title="Hackathon Enrollment"
            subtitle="National Level 24-Hour Hackathon"
            showStep={true}
            currentStep={currentStep}
            totalSteps={STEPS.length}
            steps={STEPS.map(s => s.title)}
            className="max-w-7xl"
        >

            {/* Step 1: Instructions (Refined & Expanded) */}
            {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 text-neutral-200">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-4 gap-4">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 uppercase tracking-tight">AADHRITA HACK24</h2>
                            <p className="text-lg font-bold text-neutral-400 mt-1">National-Level 24-Hour Software Hackathon</p>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-right hidden md:block">
                            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Venue</p>
                            <p className="font-bold text-white">MVGR College of Engineering</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">

                        {/* LEFT COLUMN (Main Content) - Spans 2 cols */}
                        <div className="md:col-span-2 space-y-6">

                            {/* HERO ALERT: FREE ROUND 1 (New Premium Gradient) */}
                            <div className="bg-gradient-to-br from-violet-900/50 to-indigo-900/50 backdrop-blur-md rounded-2xl p-6 text-white shadow-xl shadow-indigo-900/20 border border-white/10 relative overflow-hidden transform hover:scale-[1.01] transition-transform group">
                                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-white/20 text-white shadow-sm">Limited Slots Available</span>
                                        </div>
                                        <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-wider text-white drop-shadow-md">ROUND 1 IS FREE!</h3>
                                    </div>
                                    <div className="bg-black/30 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center min-w-[140px] shadow-lg">
                                        <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-1">Finale Entry Fee</p>
                                        <div className="flex items-center justify-center gap-1">
                                            <p className="font-black text-3xl text-white">₹600</p>
                                        </div>
                                        <p className="text-[10px] text-indigo-200 opacity-80">Per Person (If Shortlisted)</p>
                                    </div>
                                </div>
                            </div>

                            {/* About & Rules */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-sm">
                                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Event Overview
                                    </h4>
                                    <p className="text-sm text-neutral-400 leading-relaxed text-justify mb-4">
                                        A national-level hackathon by MVGR College of Engineering. Build real-world solutions in a 24-hour competitive environment.
                                    </p>
                                    <div className="text-xs font-semibold text-neutral-500 bg-black/20 p-3 rounded-lg border border-white/5">
                                        NOTE: Only Shortlisted Teams will proceed to Final Registration & Fee Payment.
                                    </div>
                                </div>

                                <div className="bg-red-950/30 p-5 rounded-2xl border border-red-500/30">
                                    <h4 className="font-bold text-red-400 text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Eligibility & Rules
                                    </h4>
                                    <ul className="space-y-2 text-sm text-neutral-200">
                                        <li className="flex gap-2 items-start"><span className="font-bold text-red-500">•</span> Team Size: <span className="font-black text-white">2 - 4 Members</span></li>
                                        <li className="flex gap-2 items-start"><span className="font-bold text-red-500">•</span> Open to UG Students Across India | Inter-Departmental Teams Allowed.</li>
                                        <li className="flex gap-2 items-start"><span className="font-bold text-red-500">•</span> No late submissions or extensions.</li>
                                        <li className="flex gap-2 items-start"><span className="font-bold text-red-500">•</span> 24-Hour Finale Date: <span className="font-bold underline text-white">12th March 2026</span></li>
                                    </ul>
                                </div>
                            </div>


                            {/* Evaluation Criteria Summary (Compact) */}
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm">
                                <h4 className="font-bold text-white text-lg mb-4 text-center md:text-left">ðŸŽ¯ Round-1 Evaluation Criteria</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div className="text-center md:text-left">
                                        <div className="text-2xl font-black text-red-500 mb-1">25%</div>
                                        <p className="font-bold text-neutral-300">Problem Clarity</p>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <div className="text-2xl font-black text-red-500 mb-1">25%</div>
                                        <p className="font-bold text-neutral-300">Feasibility</p>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <div className="text-2xl font-black text-red-500 mb-1">25%</div>
                                        <p className="font-bold text-neutral-300">Tech Approach</p>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <div className="text-2xl font-black text-red-500 mb-1">15%</div>
                                        <p className="font-bold text-neutral-300">Innovation</p>
                                    </div>
                                </div>

                                {/* Expandable Details Button */}
                                <div className="mt-6 border-t border-white/10 pt-4 flex flex-col items-center">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setFormData(prev => ({ ...prev, showDetails: !(prev as any).showDetails }))}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                                    >
                                        {(formData as any).showDetails ? "Hide Complete Event Details" : "Read More"}
                                        {(formData as any).showDetails ? <ArrowLeft className="w-3 h-3 rotate-90" /> : <ArrowRight className="w-3 h-3 rotate-90" />}
                                    </Button>

                                    {/* EXPANDABLE COMPREHENSIVE CONTENT */}
                                    {(formData as any).showDetails && (
                                        <div className="w-full mt-6 bg-black/20 rounded-xl p-4 md:p-8 border border-white/10 animate-in fade-in slide-in-from-top-2 text-sm text-neutral-300 space-y-8">

                                            {/* 1. About */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">About the Event</h5>
                                                <p className="leading-relaxed text-neutral-400">
                                                    AADHRITA HACK24 is a national-level software hackathon conducted as part of AADHRITA 2026 at MVGR College of Engineering (Autonomous). The hackathon is designed to encourage innovation, teamwork, and practical problem-solving, giving students an opportunity to build real-world solutions in a competitive and collaborative environment.
                                                </p>
                                            </section>

                                            {/* 2. Timeline */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">Important Dates & Timeline</h5>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    <li><span className="font-bold">Deadline for Round-1 Enrollment & PPT Submission:</span> <span className="text-red-400 font-black">03-Mar-2026</span></li>
                                                    <li>Enrollment will be automatically closed after this date</li>
                                                    <li>Shortlisted teams will be announced within 3 - 4 days after the deadline</li>
                                                    <li><span className="font-bold">Only shortlisted teams can proceed to:</span></li>
                                                    <ul className="list-[circle] pl-5 text-neutral-500">
                                                        <li>Final Registration</li>
                                                        <li>Fee Payment (600/- per individual)</li>
                                                        <li>Entry confirmation for AADHRITA HACK24 (24-Hour Finale - 12th March 2026)</li>
                                                    </ul>
                                                    <li className="text-red-400 font-bold">No late submissions or extensions will be entertained.</li>
                                                </ul>
                                            </section>

                                            {/* 3. Round 1 Overview */}
                                            <section className="bg-white/5 p-4 rounded-lg border border-white/10">
                                                <h5 className="text-base font-black text-indigo-400 mb-2">ROUND 1 - ONLINE SCREENING</h5>
                                                <div className="grid md:grid-cols-2 gap-4 text-xs">
                                                    <div><span className="font-bold block">Event Name:</span> AADHRITA HACK24</div>
                                                    <div><span className="font-bold block">Round:</span> Round-1 – Online Screening</div>
                                                    <div><span className="font-bold block">Type:</span> National-Level 24-Hour Software Hackathon</div>
                                                    <div><span className="font-bold block">Registration Fee:</span> FREE</div>
                                                    <div className="md:col-span-2"><span className="font-bold block">Eligibility:</span> Undergraduate students (All departments & academic years) | Inter-departmental teams allowed.</div>
                                                    <div><span className="font-bold block">Team Size:</span> 2 - 4 members per team</div>
                                                </div>
                                            </section>

                                            {/* 4. Detailed Evaluation Criteria */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-3 border-b border-white/10 pb-1">Detailed Evaluation Criteria</h5>
                                                <p className="mb-4 text-xs italic text-neutral-500">This round focuses on clarity of thought, feasibility, and technical approach, not on project completeness or complexity.</p>

                                                <div className="space-y-4">
                                                    <div>
                                                        <h6 className="font-bold text-red-400">1. Problem Understanding & Clarity (25%)</h6>
                                                        <p className="text-xs text-neutral-500 mb-1">Evaluated from: Problem Statement slide</p>
                                                        <ul className="list-disc pl-5 text-xs text-neutral-400">
                                                            <li>Clear articulation of the problem</li>
                                                            <li>Relevance and significance</li>
                                                            <li>Understanding of the problem space</li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h6 className="font-bold text-white">2. Feasibility of the Solution (25%)</h6>
                                                        <p className="text-xs text-neutral-400 mb-1">Evaluated from: Feasibility Study slide</p>
                                                        <ul className="list-disc pl-5 text-xs text-neutral-500">
                                                            <li>Time constraints & Available technology</li>
                                                            <li>Resources and assumptions</li>
                                                            <li>Focus: Can the idea realistically be built?</li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h6 className="font-bold text-white">3. Technical Thinking & Approach (25%)</h6>
                                                        <p className="text-xs text-neutral-400 mb-1">Evaluated from: Proposed Solution + Technology Stack slides</p>
                                                        <ul className="list-disc pl-5 text-xs text-neutral-500">
                                                            <li>Solution workflow or architecture</li>
                                                            <li>Logical reasoning</li>
                                                            <li>Alignment between problem and chosen technologies</li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h6 className="font-bold text-white">4. Innovation & Originality (15%)</h6>
                                                        <p className="text-xs text-neutral-400 mb-1">Evaluated across: Problem Statement + Proposed Solution</p>
                                                        <ul className="list-disc pl-5 text-xs text-neutral-500">
                                                            <li>Novelty of the idea, creativity in problem-solving.</li>
                                                            <li>Both past projects and new ideas are treated equally.</li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h6 className="font-bold text-white">5. Presentation Quality (10%)</h6>
                                                        <p className="text-xs text-neutral-400 mb-1">Evaluated across: All slides</p>
                                                        <ul className="list-disc pl-5 text-xs text-neutral-500">
                                                            <li>Clarity of explanation, structure of the PPT.</li>
                                                            <li>Ability to communicate ideas effectively.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* 5. Important Notes */}
                                            <section className="bg-amber-950/30 p-4 border-l-4 border-amber-500 rounded-r-lg">
                                                <h5 className="font-bold text-amber-500 mb-2">⚠️ Important Notes</h5>
                                                <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
                                                    <li>A fully working or complete project is <span className="font-black text-white">NOT required</span> in Round-1.</li>
                                                    <li>Optional Extra Slide is not mandatory and not scored separately.</li>
                                                    <li>Past academic/personal projects, Internship work, Concept ideas are allowed.</li>
                                                    <li>Screenshots, GitHub links, or live links are optional.</li>
                                                </ul>
                                            </section>

                                            {/* 6. Process Flow */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">Round-1 Flow</h5>
                                                <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm font-bold text-neutral-300">
                                                    <span className="bg-white/10 px-3 py-1 rounded text-center">Team Leader Registers</span>
                                                    <span className="hidden md:inline">→</span>
                                                    <span className="md:hidden text-center">↓</span>
                                                    <span className="bg-white/10 px-3 py-1 rounded text-center">Upload PPT</span>
                                                    <span className="hidden md:inline">→</span>
                                                    <span className="md:hidden text-center">↓</span>
                                                    <span className="bg-white/10 px-3 py-1 rounded text-center">Teams Shortlisted for Round-2</span>
                                                </div>
                                            </section>

                                            {/* 7. Team Formation Rules */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">Team Formation Rules</h5>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    <li>Team size must be <span className="font-bold">2 - 4 members</span> only.</li>
                                                    <li><span className="font-bold">No restriction</span> on department or academic year.</li>
                                                    <li>Team members may belong to different departments from same college.</li>
                                                    <li>A student can be part of only one team.</li>
                                                    <li>Only the Team Leader should register and submit the PPT.</li>
                                                    <li>Team composition <span className="font-bold text-red-500">cannot be changed</span> after submission.</li>
                                                </ul>
                                            </section>

                                            {/* 8. Registration Details */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">Registration Details</h5>
                                                <p className="font-bold mb-1">Who should register?</p>
                                                <p className="mb-2 text-neutral-400">Only the Team Leader.</p>
                                                <p className="font-bold mb-1">What happens after registration?</p>
                                                <ul className="list-disc pl-5 text-neutral-400">
                                                    <li>Registration confirmation email.</li>
                                                    <li>Round-1 PPT submission instructions.</li>
                                                    <li>Official WhatsApp group link (Team Leaders only).</li>
                                                </ul>
                                            </section>

                                            {/* 9. PPT Submission Format */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">PPT Submission – Official Format</h5>
                                                <p className="text-sm font-bold text-red-400 mb-2">Round-1 PPT (Screening Purpose Only)</p>
                                                <div className="bg-white/10 p-3 rounded">
                                                    <p className="font-bold mb-1">Mandatory Slide Structure:</p>
                                                    <ol className="list-decimal pl-5 space-y-1 text-neutral-300">
                                                        <li>Title Slide (Team Name, Leader, Members)</li>
                                                        <li>Problem Statement</li>
                                                        <li>Feasibility Study</li>
                                                        <li>Proposed Solution</li>
                                                        <li>Technology Stack</li>
                                                        <li>Optional Extra Slide (only if required)</li>
                                                    </ol>
                                                </div>
                                                <div className="mt-2 space-y-1 text-xs text-neutral-500">
                                                    <p>● PPT cannot be reused in finale.</p>
                                                    <p>● Plagiarism will lead to rejection.</p>
                                                    <p>● Only the prescribed PPT format accepted.</p>
                                                </div>
                                            </section>

                                            {/* 10. Shortlisting & Next Steps */}
                                            <section>
                                                <h5 className="text-lg font-black text-white mb-2 border-b border-white/10 pb-1">Shortlisting & Next Steps</h5>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    <li>Shortlisted teams announced on the AADHRITA official website.</li>
                                                    <li>Notifications will also be sent via registered email.</li>
                                                    <li><span className="font-bold">Only shortlisted teams</span> are eligible for Round-2.</li>
                                                    <li>Registration fee of <span className="font-bold">₹600 per individual</span> will be collected only after a team has been officially shortlisted.</li>
                                                    <li>The final registration link along with payment details will be enabled on the AADHRITA official website only after the shortlisted teams are announced.</li>
                                                </ul>
                                            </section>

                                            {/* 11. Round 2 Overview */}
                                            <section className="bg-red-950/40 p-4 rounded-lg border border-red-500/30">
                                                <h5 className="text-lg font-black text-white mb-2">ROUND 2 - OFFLINE HACKATHON</h5>
                                                <p className="font-bold text-red-400 mb-2">24-Hour Grand Finale (12th March 2026)</p>
                                                <ul className="list-disc pl-5 text-neutral-300 text-sm space-y-1">
                                                    <li><span className="font-bold text-white">Mode:</span> Offline (On-Campus)</li>
                                                    <li><span className="font-bold text-white">Duration:</span> 24 Continuous Hours</li>
                                                    <li><span className="font-bold text-white">Venue:</span> MVGR College of Engineering</li>
                                                    <li><span className="font-bold text-white">Task:</span> Teams must build a new project from scratch within 24 hours based on surprise problem statements.</li>
                                                    <li><span className="font-bold text-white">Note:</span> Round-1 PPT/project cannot be reused.</li>
                                                </ul>
                                            </section>

                                            {/* Close Button */}
                                            <div className="flex justify-center pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setFormData(prev => ({ ...prev, showDetails: false }))}
                                                    className="text-neutral-500 hover:text-white border-white/10 hover:bg-white/10"
                                                >
                                                    Close Details
                                                </Button>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN (Timeline, Download, Contact) */}
                        <div className="space-y-6">

                            {/* Timeline Card */}
                            <div className="bg-black/40 p-6 rounded-2xl border border-white/10 relative overflow-hidden backdrop-blur-sm">
                                <div className="absolute top-0 right-0 p-4 opacity-20"><span className="text-6xl grayscale">ðŸ“…</span></div>
                                <h4 className="font-bold text-white text-base mb-4 uppercase tracking-wide">Critical Dates</h4>

                                <div className="space-y-4">
                                    <div className="relative pl-4 border-l-2 border-red-500">
                                        <p className="text-xs text-neutral-400 font-bold uppercase mb-1">Round-1 Deadline</p>
                                        <p className="text-white font-black text-2xl">01-03-2026</p>
                                        <div className="inline-block bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1 shadow-lg shadow-red-900/50">REVISED DEADLINE</div>
                                    </div>

                                    <div className="relative pl-4 border-l-2 border-white/20">
                                        <p className="text-xs text-neutral-500 font-bold uppercase mb-1">Finale (Offline)</p>
                                        <p className="text-white font-bold text-lg">12-03-2026</p>
                                        <p className="text-xs text-neutral-500">24-Hour Hackathon</p>
                                    </div>
                                </div>
                            </div>

                            {/* Prize Pool Card */}
                            <div className="bg-gradient-to-br from-amber-950/60 to-black p-6 rounded-2xl border border-amber-500/30 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10"><span className="text-6xl">ðŸ†</span></div>
                                <h4 className="font-bold text-amber-400 text-sm mb-1 uppercase tracking-wide">Prize Pool</h4>
                                <p className="text-xs text-amber-500/80 mb-1">Up to</p>
                                <p className="text-4xl font-black text-white">₹1.5 Lakhs</p>
                            </div>


                            {/* PPT Download CTA */}

                            <div className="bg-gradient-to-br from-black to-neutral-900 p-6 rounded-2xl text-white shadow-xl shadow-black/50 text-center border border-white/10">
                                <h4 className="font-bold text-lg mb-2">PPT Format</h4>
                                <p className="text-xs text-neutral-400 mb-5">Mandatory for Round 1 Screening</p>

                                <a
                                    href="https://docs.google.com/presentation/d/1vljsdbh05qNhymy91mpiQY9t8Smz7RuY/edit?usp=sharing&ouid=114447812106063915290&rtpof=true&sd=true"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-red-900/20"
                                >
                                    Download Template
                                </a>
                            </div>

                            {/* Contact Coordinators */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-sm">
                                <h4 className="font-bold text-white text-sm mb-4 uppercase tracking-wide text-center">Queries?</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg border border-white/5">
                                        <span className="font-semibold text-neutral-300">T. Bhaskar</span>
                                        <a href="tel:8179924573" className="text-red-400 font-mono font-bold hover:underline">8179924573</a>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg border border-white/5">
                                        <span className="font-semibold text-neutral-300">A. Govardhinee</span>
                                        <a href="tel:8309945560" className="text-red-400 font-mono font-bold hover:underline">8309945560</a>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg border border-white/5">
                                        <span className="font-semibold text-neutral-300">P. Sravanthi</span>
                                        <a href="tel:9014573349" className="text-red-400 font-mono font-bold hover:underline">9014573349</a>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-8 space-y-3">
                        <h4 className="text-lg font-black text-white text-center mb-4 flex items-center justify-center gap-2">
                            <span className="text-red-500">?</span> Frequently Asked Questions
                        </h4>

                        {[
                            {
                                q: "Can participants be changed or removed from a team after registration?",
                                a: "Any request for team member changes or removal must be sent to the Hackathon Help Desk via email within the allowed modification period. Requests received after the deadline may not be considered."
                            },
                            {
                                q: "Is an extension available for payment of the registration fee?",
                                a: "Participants requesting a payment extension must contact the Help Desk through email with valid reasons. Extensions will be granted only upon organizer approval."
                            },
                            {
                                q: "Is accommodation available? Is there a separate fee?",
                                a: "Yes, accommodation is available at a cost of ₹500 per participant. Accommodation can be available on the day before the hackathon and after the hackathon. Participants can choose accommodation during the payment process of Hack24."
                            },
                            {
                                q: "What facilities and benefits are provided to participants?",
                                a: null,
                                bullets: [
                                    "Participation Certificates",
                                    "Exclusive Swags (applicable if participant count exceeds 300)",
                                    "Access to HackerRank Infinity Plan",
                                    "Workspace with power supply and internet connectivity",
                                    "Food and refreshments as per the schedule",
                                    "Mentorship and evaluation support during the hackathon",
                                ]
                            },
                            {
                                q: "What can participants expect from Aadhrita Hack24?",
                                a: null,
                                bullets: [
                                    "Real-world problem solving",
                                    "Collaboration and networking opportunities",
                                    "Guidance from mentors and experts",
                                    "Skill enhancement and competitive exposure",
                                    "Exciting prizes and recognition",
                                ]
                            },
                            {
                                q: "Will problem statements be shared before the hackathon?",
                                a: "Problem statements will be revealed at the beginning of the hackathon unless officially announced otherwise by the organizers."
                            },
                            {
                                q: "How is shortlisting and evaluation conducted?",
                                a: null,
                                bullets: [
                                    "Innovation and creativity",
                                    "Technical implementation",
                                    "Practical feasibility",
                                    "Impact and relevance of the solution",
                                    "Final presentation and demonstration",
                                ]
                            },
                            {
                                q: "Who will be part of the jury panel?",
                                a: "The jury panel will include industry experts, HackerRank representatives, and faculty members, ensuring a fair and transparent evaluation process."
                            },
                            {
                                q: "Whom should we contact for queries or support?",
                                a: <>For any queries, payment extensions, or team modification requests, participants must contact the Hackathon Help Desk via the official email: <a href="mailto:help-hack24@mvgrce.edu.in" className="text-red-400 hover:underline font-semibold">help-hack24@mvgrce.edu.in</a></>
                            },
                            {
                                q: "How long can it take to clear the first round?",
                                a: "Any team can generally be reviewed and approved within 6–8 hours of enrolling."
                            },
                        ].map((faq, i) => (
                            <details key={i} className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                <summary className="flex items-start justify-between p-4 cursor-pointer hover:bg-white/[0.07] transition-colors select-none gap-3">
                                    <span className="font-semibold text-sm text-neutral-200 leading-snug">
                                        <span className="text-red-500 font-black mr-2">{i + 1}.</span>{faq.q}
                                    </span>
                                    <span className="text-neutral-500 group-open:rotate-180 transition-transform shrink-0 mt-0.5 text-lg leading-none">▾</span>
                                </summary>
                                <div className="px-4 pb-4 text-sm text-neutral-400 leading-relaxed border-t border-white/5 pt-3">
                                    {faq.bullets ? (
                                        <ul className="space-y-1">
                                            {faq.bullets.map((b, j) => (
                                                <li key={j} className="flex gap-2 items-start">
                                                    <span className="text-red-500 shrink-0">•</span>{b}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>{faq.a}</p>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            )}


            {/* Step 2: Team Info */}
            {currentStep === 2 && (
                <div className="space-y-6 max-w-lg mx-auto animate-in fade-in slide-in-from-right-4">
                    <InputField section="root" field="teamName" label="Team Name" placeholder="e.g. Code Warriors" formData={formData} updateField={updateField} />

                    <div className="space-y-2">
                        <Label className="text-neutral-300 font-semibold text-sm">Team Size <span className="text-red-500">*</span></Label>
                        <Select value={formData.teamSize} onValueChange={(v) => updateField('root', 'teamSize', v)}>
                            <SelectTrigger className="bg-black/50 border-white/10 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="2" className="focus:bg-white/10 focus:text-white">2 Members</SelectItem>
                                <SelectItem value="3" className="focus:bg-white/10 focus:text-white">3 Members</SelectItem>
                                <SelectItem value="4" className="focus:bg-white/10 focus:text-white">4 Members</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Step 3: College */}
            {currentStep === 3 && (
                <div className="space-y-6 max-w-lg mx-auto animate-in fade-in slide-in-from-right-4">
                    <InputField section="root" field="collegeName" label="College Name" placeholder="Full College Name" formData={formData} updateField={updateField} />
                    <InputField section="root" field="collegeCity" label="College City" placeholder="City" formData={formData} updateField={updateField} />

                    <div className="space-y-1">
                        <InputField
                            section="root"
                            field="collegeState"
                            label="College State"
                            placeholder="Type to search state..."
                            formData={formData}
                            updateField={updateField}
                            list="indian-states"
                        />
                        <datalist id="indian-states">
                            {INDIAN_STATES.map(state => (
                                <option key={state} value={state} />
                            ))}
                        </datalist>
                    </div>
                </div>
            )}

            {/* Step 4: Members */}
            {currentStep === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                    {/* Team Lead */}
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 relative">
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">Team Lead</div>
                        <h3 className="font-bold text-lg mb-4 text-white">Team Lead Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField section="lead" field="name" label="Name" placeholder="Full Name" formData={formData} updateField={updateField} />
                            <InputField section="lead" field="regNo" label="Registration Number" placeholder="Roll Number" formData={formData} updateField={updateField} />
                            <InputField section="lead" field="dept" label="Department" placeholder="e.g CSE" formData={formData} updateField={updateField} />
                            <InputField section="lead" field="year" label="Year" placeholder="e.g 3rd" formData={formData} updateField={updateField} />
                            <InputField section="lead" field="email" label="Email" placeholder="Email" type="email" formData={formData} updateField={updateField} />
                            <InputField section="lead" field="phone" label="Phone" placeholder="Mobile" type="tel" formData={formData} updateField={updateField} />
                            <IdUpload section="lead" label="Lead ID Card" formData={formData} updateField={updateField} handleFileSelect={handleFileSelect} />
                        </div>
                    </div>

                    {/* Member 2 */}
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                        <h3 className="font-bold text-lg mb-4 text-white">Member 2 Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField section="member2" field="name" label="Name" placeholder="Full Name" formData={formData} updateField={updateField} />
                            <InputField section="member2" field="regNo" label="Registration Number" placeholder="Roll Number" formData={formData} updateField={updateField} />
                            <InputField section="member2" field="dept" label="Department" placeholder="e.g CSE" formData={formData} updateField={updateField} />
                            <InputField section="member2" field="year" label="Year" placeholder="e.g 3rd" formData={formData} updateField={updateField} />
                            <InputField section="member2" field="email" label="Email" placeholder="Email" type="email" formData={formData} updateField={updateField} />
                            <InputField section="member2" field="phone" label="Phone" placeholder="Mobile" type="tel" formData={formData} updateField={updateField} />
                            <IdUpload section="member2" label="Member 2 ID" formData={formData} updateField={updateField} handleFileSelect={handleFileSelect} />
                        </div>
                    </div>

                    {/* Member 3 (Conditional) */}
                    {parseInt(formData.teamSize) >= 3 && (
                        <div className="bg-white/5 p-6 rounded-xl border border-white/10 animate-in fade-in">
                            <h3 className="font-bold text-lg mb-4 text-white">Member 3 Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField section="member3" field="name" label="Name" placeholder="Full Name" formData={formData} updateField={updateField} />
                                <InputField section="member3" field="regNo" label="Registration Number" placeholder="Roll Number" formData={formData} updateField={updateField} />
                                <InputField section="member3" field="dept" label="Department" placeholder="e.g CSE" formData={formData} updateField={updateField} />
                                <InputField section="member3" field="year" label="Year" placeholder="e.g 3rd" formData={formData} updateField={updateField} />
                                <InputField section="member3" field="email" label="Email" placeholder="Email" type="email" formData={formData} updateField={updateField} />
                                <InputField section="member3" field="phone" label="Phone" placeholder="Mobile" type="tel" formData={formData} updateField={updateField} />
                                <IdUpload section="member3" label="Member 3 ID Card" formData={formData} updateField={updateField} handleFileSelect={handleFileSelect} />
                            </div>
                        </div>
                    )}

                    {/* Member 4 (Conditional) */}
                    {parseInt(formData.teamSize) >= 4 && (
                        <div className="bg-white/5 p-6 rounded-xl border border-white/10 animate-in fade-in">
                            <h3 className="font-bold text-lg mb-4 text-white">Member 4 Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField section="member4" field="name" label="Name" placeholder="Full Name" formData={formData} updateField={updateField} />
                                <InputField section="member4" field="regNo" label="Registration Number" placeholder="Roll Number" formData={formData} updateField={updateField} />
                                <InputField section="member4" field="dept" label="Department" placeholder="e.g CSE" formData={formData} updateField={updateField} />
                                <InputField section="member4" field="year" label="Year" placeholder="e.g 3rd" formData={formData} updateField={updateField} />
                                <InputField section="member4" field="email" label="Email" placeholder="Email" type="email" formData={formData} updateField={updateField} />
                                <InputField section="member4" field="phone" label="Phone" placeholder="Mobile" type="tel" formData={formData} updateField={updateField} />
                                <IdUpload section="member4" label="Member 4 ID Card" formData={formData} updateField={updateField} handleFileSelect={handleFileSelect} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 5: PPT & Final */}
            {currentStep === 5 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                    <InputField section="root" field="pptTitle" label="PPT/Idea Title" placeholder="Title of your Idea" formData={formData} updateField={updateField} />

                    <div className="space-y-2">
                        <Label className="text-neutral-300 font-semibold text-sm">Upload PPT (PDF/PPTX) <span className="text-red-500">*</span></Label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-black/20 hover:bg-white/5 transition-all relative">
                            {formData.pptUrl ? (
                                <div className="text-center w-full">
                                    <FileText className="w-12 h-12 text-red-600 mx-auto mb-2" />
                                    <p className="font-bold text-neutral-300 mb-1">Presentation Selected</p>
                                    <a href={formData.pptUrl} target="_blank" className="text-xs text-blue-400 underline mb-2 block">View File</a>
                                    <Button size="sm" variant="outline" onClick={() => updateField('root', 'pptUrl', '')} className="border-white/10 text-neutral-300 hover:bg-white/10">Change File</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
                                        <UploadCloud className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-neutral-300">Click to Upload PPT</p>
                                        <p className="text-xs text-neutral-500 mt-1">PDF or PPTX (Max 20MB)</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".pdf,.ppt,.pptx"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'ppt', ['root', 'pptUrl'])}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border border-white/10 rounded-xl hover:border-red-500/30 transition-colors cursor-pointer bg-white/5" onClick={() => updateField('root', 'usedTemplate', !formData.usedTemplate)}>
                        <Checkbox checked={formData.usedTemplate} className="border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                        <div className="grid gap-1.5 leading-none">
                            <label className="text-sm font-medium text-neutral-200 cursor-pointer">I Confirm I used the official PPT Template.</label>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-neutral-300 font-semibold text-sm">Preferred Communication <span className="text-red-500">*</span></Label>
                        <Select value={formData.communicationChannel} onValueChange={(v) => updateField('root', 'communicationChannel', v)}>
                            <SelectTrigger className="bg-black/50 border-white/10 text-white"><SelectValue placeholder="Select Channel" /></SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                {COMMUNICATION_CHANNELS.map(c => (
                                    <SelectItem key={c} value={c} className="focus:bg-white/10 focus:text-white">{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <InputField section="root" field="emergencyContact" label="Emergency Contact (Lead)" placeholder="Phone Number" type="tel" formData={formData} updateField={updateField} />

                    <div className="space-y-1">
                        <Label className="text-neutral-300 font-semibold text-sm">How did you hear about us? <span className="text-red-500">*</span></Label>
                        <Select value={formData.referralSource} onValueChange={(v) => updateField('root', 'referralSource', v)}>
                            <SelectTrigger className="bg-black/50 border-white/10 text-white"><SelectValue placeholder="Select Source" /></SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                {REFERRAL_SOURCES.map(s => (
                                    <SelectItem key={s} value={s} className="focus:bg-white/10 focus:text-white">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex flex-col md:flex-row justify-between gap-4 mt-12 pt-6 border-t border-white/10">
                <Button
                    onClick={() => currentStep === 1 ? router.push('/') : setCurrentStep(p => p - 1)}
                    disabled={loading}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-red-900/20 transition-all border border-red-600 order-2 md:order-1"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {!user && currentStep === 1 ? (
                    <Button
                        onClick={() => googleLogin('/enrollment/hackathon')}
                        disabled={loading}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 md:px-8 py-6 md:py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-3 order-1 md:order-2"
                    >
                        <div className="bg-white rounded-full p-1.5 flex-shrink-0"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" /></div>
                        <span className="text-sm md:text-base">Login with Google to Continue</span>
                    </Button>
                ) : (
                    <Button
                        onClick={handleNext}
                        disabled={loading || !!uploading}
                        className={cn(
                            "w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-red-900/20 transition-all order-1 md:order-2",
                            loading && "opacity-80"
                        )}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : currentStep === STEPS.length ? "Submit Enrollment" : "Next Step"}
                        {!loading && currentStep !== STEPS.length && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                )}
            </div>

        </RoyalFormLayout>
    );
}


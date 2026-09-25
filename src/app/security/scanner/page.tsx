'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getStaffSession, clearStaffSession } from '@/lib/staff-auth';
import { Scanner } from '@yudiel/react-qr-scanner';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { LogOut, RefreshCw, CheckCircle, XCircle, ArrowRightLeft, User, Maximize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming global utils

// Type for the Scan Result
interface ScannedUser {
    uid: string;
    fullName: string;
    photoUrl?: string;
    regNo?: string;
    hasEntryPass: boolean;
    valid: boolean;
    role: string;
    isHackathonPass?: boolean;
    teamName?: string;
    hasEntered?: boolean;
    hasWelcomeKit?: boolean;
    kitHandoverLoggedBySecurity?: boolean;
    isKitEligible?: boolean;
    college?: string;
    lastScanTime?: string;
    lastScanType?: string;
}

export default function SecurityScannerPage() {
    const router = useRouter();
    const [session, setSession] = React.useState<any>(null);
    const [scanning, setScanning] = React.useState(true);
    const [scanResult, setScanResult] = React.useState<ScannedUser | null>(null);
    const [processing, setProcessing] = React.useState(false);
    const [mode, setMode] = React.useState<'ENTRY' | 'EXIT'>('ENTRY'); // Toggle Mode

    // Auth Check
    React.useEffect(() => {
        const s = getStaffSession();
        if (!s || s.role !== 'security') {
            router.replace('/security');
            return;
        }
        setSession(s);
    }, [router]);

    const logAccess = async (userResult: ScannedUser) => {
        if (!session) return;
        try {
            await addDoc(collection(db, COLLECTIONS.ACCESS_LOGS), {
                userId: userResult.uid,
                userName: userResult.fullName,
                userRegNo: userResult.regNo || 'N/A',
                scanType: mode,
                scannerId: session.username,
                timestamp: serverTimestamp(),
                location: 'Main Gate'
            });
            toast.success(`${mode} Logged for ${userResult.fullName.split(' ')[0]}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to log entry");
        }
    };

    const handleScan = async (rawValue: string) => {
        if (!scanning || processing) return;
        setScanning(false);
        setProcessing(true);

        try {
            let uid = rawValue.trim();
            let isUrl = false;
            
            // Resilience Logic: Parse UID from various possible QR formats
            try {
                if (uid.includes('/pass/')) {
                    const parts = uid.split('/pass/');
                    uid = parts[parts.length - 1].trim();
                    isUrl = true;
                } else if (uid.startsWith('{')) {
                    // Try to parse as JSON if it looks like one
                    try {
                        const data = JSON.parse(uid);
                        if (data.uid) uid = data.uid.trim();
                    } catch (e) {
                        // If JSON parse fails but it started with '{', 
                        // it might be mangled JSON with special characters.
                        // Try a regex fallback for "uid":"..."
                        const match = uid.match(/"uid"\s*:\s*"([^"]+)"/);
                        if (match && match[1]) uid = match[1].trim();
                    }
                }
            } catch (e) {
                console.error("UID Extraction failed for value:", rawValue);
            }

            let finalResult: ScannedUser | null = null;

            // System Lookup
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                finalResult = {
                    uid: userSnap.id,
                    fullName: userData.fullName || 'Unknown Name',
                    photoUrl: userData.photoUrl,
                    regNo: userData.regNo || userData.registrationNumber || 'N/A',
                    hasEntryPass: userData.hasEntryPass === true,
                    valid: userData.hasEntryPass === true,
                    role: userData.role || 'user',
                    hasWelcomeKit: (userData.hasReceivedWelcomeKit === true || userData.kitHandoverLoggedBySecurity === true),
                    kitHandoverLoggedBySecurity: userData.kitHandoverLoggedBySecurity === true,
                    isKitEligible: true,
                    college: userData.college || 'MVGR / Unknown'
                };
            }

            if (!finalResult) {
                const passQuery = query(collection(db, 'hackathon_passes'), where('token', '==', uid));
                const passSnap = await getDocs(passQuery);
                if (!passSnap.empty) {
                    const passData = passSnap.docs[0].data();
                    finalResult = {
                        uid: passData.token || uid,
                        fullName: passData.memberName || passData.teamName || 'Hackathon Member',
                        photoUrl: passData.memberIdCardUrl || undefined,
                        regNo: passData.memberRegNo || 'HACKATHON',
                        hasEntryPass: true,
                        valid: true,
                        role: 'hackathon',
                        isHackathonPass: true,
                        teamName: passData.teamName,
                        isKitEligible: false,
                        college: passData.collegeName || 'Unknown College'
                    };
                }
            }

            if (!finalResult) {
                throw new Error("Not found inside systems");
            }

            if (finalResult.valid) {
                try {
                    const logsQuery = query(
                        collection(db, COLLECTIONS.ACCESS_LOGS),
                        where('userId', '==', finalResult.uid)
                    );
                    const logsSnap = await getDocs(logsQuery);
                    const logs = logsSnap.docs.map(d => d.data());

                    // Sort logs to find the most recent one visually
                    const sortedLogs = logs
                        .filter(l => l.timestamp)
                        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

                    if (sortedLogs.length > 0) {
                        const mostRecent = sortedLogs[0];
                        finalResult.lastScanType = mostRecent.scanType;
                        finalResult.lastScanTime = mostRecent.timestamp.toDate().toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                        });
                    }

                    // Detection via logs
                    finalResult.hasEntered = logs.some(l => l.scanType === mode);
                    const loggedHandover = logs.some(l => l.scanType === 'HANDOVER');
                    if (loggedHandover) {
                        finalResult.hasWelcomeKit = true;
                        finalResult.kitHandoverLoggedBySecurity = true;
                    }
                } catch (logError) {
                    console.error("Error fetching logs:", logError);
                    finalResult.hasEntered = false; // Fallback to allow manual confirm
                }
            }

            // Apply Result
            setScanResult(finalResult);

            // Removed Auto Reset logic so Guards have infinite time to read data until they click "Next Scan" Wait for manual action.

        } catch (error: any) {
            console.error("Scanner Error:", error);
            toast.error("Invalid QR or Error");
            setScanResult({
                uid: 'unknown', fullName: 'Unknown User', hasEntryPass: false, valid: false, role: 'unknown'
            });
            setTimeout(() => resetScanner(), 2000);
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmEntry = async () => {
        if (!scanResult || !scanResult.valid) return;
        setProcessing(true);
        try {
            await logAccess(scanResult);
            // Also update user doc for real-time pass UI (CRITICAL for student visibility)
            if (!scanResult.isHackathonPass) {
                const userRef = doc(db, 'users', scanResult.uid);
                await updateDoc(userRef, {
                    hasEntered: true,
                    lastEntryAt: serverTimestamp()
                });
            }
            setScanResult({ ...scanResult, hasEntered: true });
        } catch (error) {
            console.error("Entry confirmation error:", error);
        } finally {
            setProcessing(false);
        }
    };

    const handleHandoverKit = async () => {
        if (!scanResult || !scanResult.valid) return;
        setProcessing(true);
        try {
            // 1. Log to access_logs (for student real-time check)
            await addDoc(collection(db, COLLECTIONS.ACCESS_LOGS), {
                userId: scanResult.uid,
                userName: scanResult.fullName,
                userRegNo: scanResult.regNo || 'N/A',
                scanType: 'HANDOVER',
                scannerId: session.username,
                timestamp: serverTimestamp(),
                location: 'Welcome Kit Desk'
            });

            // 2. We ALSO update the users collection flag
            // This is CRITICAL because students may not have read permissions on access_logs
            const userRef = doc(db, 'users', scanResult.uid);
            
            console.log('[Scanner] Updating user doc flag for:', scanResult.uid);
            await updateDoc(userRef, {
                kitHandoverLoggedBySecurity: true,
                kitHandoverAt: serverTimestamp(),
                kitHandoverBy: session.username
            });

            toast.success('Handover Logged! Student can now confirm.');
            setScanResult({ 
                ...scanResult, 
                lastScanType: 'HANDOVER', 
                hasWelcomeKit: true,
                kitHandoverLoggedBySecurity: true 
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update Welcome Kit status');
        } finally {
            setProcessing(false);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setScanning(true);
        setProcessing(false);
    };

    const handleLogout = () => {
        clearStaffSession();
        router.push('/security');
    };

    if (!session) return null;

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col">

            {/* Header Overlay */}
            <header className="absolute top-0 w-full z-50 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">{session.username}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMode(mode === 'ENTRY' ? 'EXIT' : 'ENTRY')}
                        className={cn(
                            "h-8 border text-xs font-bold uppercase tracking-wider transition-colors backdrop-blur-md",
                            mode === 'ENTRY'
                                ? "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                        )}
                    >
                        <ArrowRightLeft className="w-3 h-3 mr-2" />
                        {mode} Mode
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-300 hover:text-white hover:bg-white/10">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Full Screen Scanner Area */}
            {(!scanResult || scanning || processing) && (
                <div className="absolute inset-0 z-0 bg-zinc-950 flex flex-col items-center justify-center py-20">
                    {scanning && (
                        <>
                            <Scanner
                                onScan={(results) => {
                                    if (results?.[0]?.rawValue) handleScan(results[0].rawValue);
                                }}
                                styles={{ container: { width: '100%', height: '100%', objectFit: 'cover' } }}
                            />
                            {/* Overlay UI */}
                            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                                <div className="w-full h-full max-w-[300px] max-h-[300px] border-2 border-white/30 relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 animate-scanline" />

                                    <div className="absolute -bottom-16 left-0 right-0 text-center">
                                        <span className="bg-black/80 text-white text-xs px-4 py-2 rounded-full uppercase tracking-wider backdrop-blur-xl border border-white/10 inline-block pointer-events-auto">
                                            Scanning for {mode}...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {!scanning && !scanResult && processing && (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 bg-black/80 w-full z-10 absolute inset-0 backdrop-blur-sm">
                            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            <p className="text-xs text-green-400 uppercase tracking-widest font-bold font-mono">Verifying Identity...</p>
                        </div>
                    )}

                    {!scanResult && (
                        <div className="absolute bottom-8 left-0 right-0 px-6 z-20 pointer-events-auto flex justify-center">
                            {!scanning && !processing && (
                                <Button variant="outline" className="text-zinc-300 border-zinc-700 bg-black/60 backdrop-blur-md" onClick={resetScanner}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Reset Scanner
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Sheet Overlay Result */}
            {!scanning && scanResult && (
                <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={cn(
                        "flex flex-col items-center p-6 text-center animate-in slide-in-from-bottom-[100%] duration-300 rounded-t-[2.5rem] border-t-4 shadow-[0_-10px_50px_rgba(0,0,0,0.5)] relative overflow-hidden h-[90vh]",
                        scanResult.valid ? "bg-zinc-950 border-green-500" : "bg-zinc-950 border-red-500"
                    )}>
                        {/* Ambient glow inside sheet */}
                        <div className={cn(
                            "absolute top-0 w-full h-40 opacity-20 blur-3xl -z-10",
                            scanResult.valid ? "bg-green-500" : "bg-red-500"
                        )} />

                        {/* Top Handle */}
                        <div className="w-16 h-1.5 bg-white/20 rounded-full mb-6 shrink-0" />

                        <div className="flex-1 flex flex-col items-center justify-start w-full gap-5 overflow-y-auto pb-6 w-full max-w-sm mx-auto no-scrollbar pt-2">
                            <div className={cn(
                                "w-32 h-32 rounded-full border-4 overflow-hidden shadow-2xl relative shrink-0",
                                scanResult.valid ? "border-green-500 shadow-green-500/40" : "border-red-500 shadow-red-500/40"
                            )}>
                                {scanResult.photoUrl ? (
                                    <img src={scanResult.photoUrl} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <User className="w-12 h-12 text-white/50" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 mt-2">
                                <h2 className={cn("text-3xl font-black uppercase text-white leading-tight break-words", !scanResult.valid && "text-red-300")}>
                                    {scanResult.fullName}
                                </h2>
                                <p className="text-lg font-mono text-zinc-300 font-bold">{scanResult.regNo}</p>
                                {scanResult.college && (
                                    <p className="text-xs text-zinc-400 uppercase tracking-widest">{scanResult.college}</p>
                                )}
                            </div>

                            {scanResult.lastScanTime && (
                                <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-300 text-xs font-mono w-full text-center">
                                    Last Logged: <span className="font-bold text-white">{scanResult.lastScanType}</span> at {scanResult.lastScanTime}
                                </div>
                            )}

                            {scanResult.isHackathonPass && (
                                <div className="flex items-center gap-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/30">
                                    <span className="text-sm">🎫</span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-center">
                                        Hackathon {scanResult.teamName ? `(${scanResult.teamName})` : ''}
                                    </span>
                                </div>
                            )}

                            {!scanResult.valid && (
                                <div className="mt-4 flex flex-col items-center justify-center gap-3 w-full">
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 w-full py-5 rounded-3xl font-black uppercase tracking-widest text-lg flex items-center justify-center gap-3">
                                        <XCircle className="w-7 h-7" />
                                        ACCESS IGNORED
                                    </div>
                                </div>
                            )}

                            {scanResult.valid && (
                                <div className="w-full mt-4 space-y-4">
                                    {scanResult.hasEntered ? (
                                        <div className="bg-zinc-900 border border-green-500/30 text-green-500 h-16 w-full rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                            <CheckCircle className="w-6 h-6" />
                                            {mode === 'ENTRY' ? "ALREADY ENTERED" : "ALREADY EXITED"}
                                        </div>
                                    ) : (
                                        <Button onClick={handleConfirmEntry} disabled={processing} className="w-full bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest h-16 text-xl rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all active:scale-95">
                                            {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : `Confirm ${mode}`}
                                        </Button>
                                    )}

                                    {scanResult.isKitEligible && (
                                        scanResult.hasWelcomeKit ? (
                                            <div className="bg-purple-950/30 border border-purple-500/30 text-purple-400 h-14 w-full rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                                <CheckCircle className="w-6 h-6" />
                                                KIT HANDED OVER
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={handleHandoverKit}
                                                disabled={processing || !scanResult.hasEntered}
                                                variant="outline"
                                                className="w-full bg-purple-600 hover:bg-purple-500 text-white border-none font-bold uppercase tracking-widest h-16 text-sm rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 transition-all active:scale-95"
                                            >
                                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Handover Welcome Kit"}
                                            </Button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dismiss Area */}
                        <div className="w-full pt-4 border-t border-white/5 bg-zinc-950 shrink-0 pb-2">
                            <Button variant="ghost" className="w-full text-zinc-400 hover:text-white hover:bg-white/5 h-14 rounded-2xl font-bold uppercase tracking-widest" onClick={resetScanner}>
                                Next QR Scan
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

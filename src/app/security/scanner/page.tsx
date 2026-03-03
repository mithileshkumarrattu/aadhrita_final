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
    isKitEligible?: boolean;
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
            let uid = rawValue;
            let isUrl = false;
            try {
                if (rawValue.includes('/pass/')) {
                    const parts = rawValue.split('/pass/');
                    uid = parts[parts.length - 1];
                    isUrl = true;
                } else {
                    const data = JSON.parse(rawValue);
                    if (data.uid) uid = data.uid;
                }
            } catch (e) { }

            let finalResult: ScannedUser | null = null;

            if (!isUrl) {
                const userRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    finalResult = {
                        uid: userSnap.id, // Use document ID reliably
                        fullName: userData.fullName || 'Unknown Name',
                        photoUrl: userData.photoUrl,
                        regNo: userData.registrationNumber,
                        hasEntryPass: userData.hasEntryPass || false,
                        valid: userData.hasEntryPass === true,
                        role: userData.role || 'user',
                        hasWelcomeKit: userData.hasReceivedWelcomeKit === true,
                        isKitEligible: true
                    };
                }
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
                        hasWelcomeKit: passData.hasReceivedWelcomeKit === true,
                        isKitEligible: true
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
                    finalResult.hasEntered = logsSnap.docs.some(d => d.data().scanType === mode);
                } catch (logError) {
                    console.error("Error fetching logs:", logError);
                    finalResult.hasEntered = false; // Fallback to allow manual confirm
                }
            }

            // Apply Result
            setScanResult(finalResult);

            // Auto Reset after 2.5 seconds ONLY if invalid. If valid, wait for manual action.
            if (!finalResult.valid) {
                setTimeout(() => resetScanner(), 2500);
            }

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
        await logAccess(scanResult);
        setScanResult({ ...scanResult, hasEntered: true });
        setProcessing(false);
    };

    const handleHandoverKit = async () => {
        if (!scanResult || !scanResult.valid) return;
        setProcessing(true);
        try {
            if (scanResult.isHackathonPass) {
                const passQuery = query(collection(db, 'hackathon_passes'), where('token', '==', scanResult.uid));
                const passSnap = await getDocs(passQuery);
                if (!passSnap.empty) {
                    await updateDoc(passSnap.docs[0].ref, { hasReceivedWelcomeKit: true });
                }
            } else {
                await updateDoc(doc(db, 'users', scanResult.uid), { hasReceivedWelcomeKit: true });
            }
            toast.success('Welcome Kit marked as handed over!');
            setScanResult({ ...scanResult, hasWelcomeKit: true });
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
        <div className="min-h-screen bg-black text-white pb-20">

            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800 p-4 flex justify-between items-center">
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
                            "h-8 border text-xs font-bold uppercase tracking-wider transition-colors",
                            mode === 'ENTRY'
                                ? "bg-green-500/10 text-green-500 border-green-500/50 hover:bg-green-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20"
                        )}
                    >
                        <ArrowRightLeft className="w-3 h-3 mr-2" />
                        {mode} Mode
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-500">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 px-4 max-w-md mx-auto space-y-4">

                {/* Scanner Area */}
                {(!scanResult || scanning || processing) && (
                    <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-900">
                        {scanning && (
                            <>
                                <Scanner
                                    onScan={(results) => {
                                        if (results?.[0]?.rawValue) handleScan(results[0].rawValue);
                                    }}
                                    styles={{ container: { width: '100%', height: '100%' } }}
                                />
                                {/* Overlay UI */}
                                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none">
                                    <div className="w-full h-full border-2 border-white/30 relative">
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500" />
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500" />
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500" />
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500" />
                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 animate-scanline" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <span className="bg-black/60 text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                                        Scanning for {mode}...
                                    </span>
                                </div>
                            </>
                        )}

                        {!scanning && !scanResult && processing && (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-zinc-500 uppercase tracking-widest">Verifying Identity...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Result Overlay Full-Size */}
                {!scanning && scanResult && (
                    <div className={cn(
                        "flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-200 min-h-[65vh] rounded-3xl border-2 shadow-2xl relative overflow-hidden",
                        scanResult.valid ? "bg-green-950/40 border-green-500/30" : "bg-red-950/40 border-red-500/30"
                    )}>
                        {/* Ambient glow */}
                        <div className={cn(
                            "absolute top-0 w-full h-full opacity-20 blur-3xl rounded-full -z-10",
                            scanResult.valid ? "bg-green-500" : "bg-red-500"
                        )} />

                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                            <div className={cn(
                                "w-32 h-32 rounded-full border-4 mb-6 overflow-hidden shadow-2xl relative",
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

                            <h2 className={cn("text-3xl font-black uppercase text-white leading-none mb-2", !scanResult.valid && "text-red-300")}>
                                {scanResult.fullName.split(' ')[0]}
                            </h2>
                            <p className="text-sm font-mono text-white/70 mb-4 bg-black/40 px-3 py-1 rounded-full border border-white/10">{scanResult.regNo || 'NO REG NO'}</p>

                            {scanResult.isHackathonPass && (
                                <div className="mb-4 flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-white px-4 py-1.5 rounded-full border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                        <span className="text-sm">🎫</span>
                                        <span className="text-xs font-bold uppercase tracking-widest">Hackathon Participant</span>
                                    </div>
                                    {scanResult.teamName && <span className="text-xs font-medium text-white/60">Team: {scanResult.teamName}</span>}
                                </div>
                            )}

                            {!scanResult.valid && (
                                <div className="mt-6 flex flex-col items-center justify-center gap-3">
                                    <div className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xl flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                                        <XCircle className="w-8 h-8" />
                                        ACCESS IGNORED
                                    </div>
                                    <p className="text-xs text-red-300 uppercase tracking-widest bg-red-950/50 border border-red-500/20 px-4 py-2 rounded-xl">No valid pass detected.</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons at Bottom */}
                        {scanResult.valid && (
                            <div className="w-full mt-auto space-y-3 pt-6 border-t border-white/10">
                                {scanResult.hasEntered ? (
                                    <div className="bg-green-500/20 border border-green-500 text-green-400 h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                        <CheckCircle className="w-6 h-6" />
                                        {mode === 'ENTRY' ? "ALREADY ENTERED" : "ALREADY EXITED"}
                                    </div>
                                ) : (
                                    <Button onClick={handleConfirmEntry} disabled={processing} className="w-full bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest h-14 text-lg rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : `Confirm ${mode}`}
                                    </Button>
                                )}

                                {scanResult.isKitEligible && (
                                    scanResult.hasWelcomeKit ? (
                                        <div className="bg-purple-500/20 border border-purple-500 text-purple-400 h-14 rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                            <CheckCircle className="w-6 h-6" />
                                            KIT RECEIVED
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={handleHandoverKit}
                                            disabled={processing || !scanResult.hasEntered}
                                            variant="outline"
                                            className="w-full border-purple-500 text-purple-400 hover:bg-purple-500/20 font-bold uppercase tracking-widest h-14 text-sm rounded-2xl"
                                        >
                                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Welcome Kit Handed Over"}
                                        </Button>
                                    )
                                )}

                                <Button variant="ghost" className="w-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors mt-2 h-12 rounded-xl text-xs uppercase tracking-widest" onClick={resetScanner}>
                                    Next Scan
                                </Button>
                            </div>
                        )}
                        {!scanResult.valid && (
                            <div className="w-full mt-auto pt-6 border-t border-white/10">
                                <Button variant="ghost" className="w-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors h-14 rounded-2xl font-black uppercase tracking-widest" onClick={resetScanner}>
                                    Reset Scanner
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Instructions / Status */}
                {!scanResult && (
                    <Card className="bg-zinc-900 border-zinc-800 p-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-zinc-800 rounded-lg">
                                <Maximize2 className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">Ready to Scan</h3>
                                <p className="text-xs text-zinc-500">
                                    Point camera at the Entry Pass QR code.
                                    Ensure adequate lighting.
                                    Switch mode using top right button.
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Manual Reset (If stuck) */}
                {!scanning && !scanResult && (
                    <Button variant="ghost" className="w-full text-zinc-500" onClick={resetScanner}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset Scanner
                    </Button>
                )}

            </main>
        </div>
    );
}

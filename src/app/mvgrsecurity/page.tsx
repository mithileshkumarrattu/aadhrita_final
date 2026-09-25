'use client';

import * as React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/db';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MVGRSecurityScannerPage() {
    const [scanning, setScanning] = React.useState(true);
    const [processing, setProcessing] = React.useState(false);
    const [result, setResult] = React.useState<'VALID' | 'INVALID' | null>(null);

    // Ultra simple verification
    const verifyUser = async (rawValue: string) => {
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

            let isValid = false;

            // 1. Check normal users
            if (!isUrl) {
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists()) {
                    isValid = userSnap.data().hasEntryPass === true;
                }
            }

            // 2. Check hackathon
            if (!isValid) {
                const passQuery = query(collection(db, 'hackathon_passes'), where('token', '==', uid));
                const passSnap = await getDocs(passQuery);
                if (!passSnap.empty) {
                    isValid = true; // Any true hackathon token is valid
                }
            }

            setResult(isValid ? 'VALID' : 'INVALID');

            // Auto-reset after 2.5 seconds
            setTimeout(() => {
                setResult(null);
                setScanning(true);
                setProcessing(false);
            }, 2500);

        } catch (error) {
            console.error(error);
            setResult('INVALID');
            setTimeout(() => {
                setResult(null);
                setScanning(true);
                setProcessing(false);
            }, 2500);
        }
    };

    return (
        <div className="fixed inset-0 overflow-hidden bg-black flex flex-col pointer-events-auto">

            {/* Massive Status Screen */}
            {result && (
                <div className={cn(
                    "absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in duration-200",
                    result === 'VALID' ? "bg-green-600" : "bg-red-600"
                )}>
                    {result === 'VALID' ? (
                        <CheckCircle2 className="w-64 h-64 text-white drop-shadow-2xl animate-in zoom-in-75 duration-300" />
                    ) : (
                        <XCircle className="w-64 h-64 text-white drop-shadow-2xl animate-in zoom-in-75 duration-300" />
                    )}
                </div>
            )}

            {/* Loading / Processing Screen */}
            {!scanning && processing && !result && (
                <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-32 h-32 animate-spin text-white mb-8" />
                </div>
            )}

            {/* Scanner Area */}
            {scanning && (
                <div className="flex-1 w-full bg-black relative">
                    <Scanner
                        onScan={(results) => {
                            if (results?.[0]?.rawValue) verifyUser(results[0].rawValue);
                        }}
                        styles={{ container: { width: '100%', height: '100%', objectFit: 'cover' } }}
                    />
                    {/* Targeting reticle */}
                    <div className="absolute inset-0 border-[50px] border-black/80 pointer-events-none flex items-center justify-center">
                        <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] border-4 border-white">
                            <div className="w-full h-1 bg-red-500 absolute top-1/2 left-0 animate-scanline shadow-[0_0_20px_rgba(239,68,68,1)]" />
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Emergency Reset Button (Invisible unless tapped many times, or just small at bottom) */}
            <div className="absolute bottom-4 right-4 z-[60]">
                <Button
                    variant="ghost"
                    className="w-16 h-16 rounded-full bg-white/10 text-transparent hover:text-white"
                    onClick={() => {
                        setResult(null);
                        setScanning(true);
                        setProcessing(false);
                        toast('Scanner Reset manually.');
                    }}
                >
                    ...
                </Button>
            </div>

        </div>
    );
}

'use client';

import * as React from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/db';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, BedDouble, AlertTriangle, RefreshCw } from 'lucide-react';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';

const cinzel = Cinzel({ subsets: ['latin'] });

interface PassData {
    token: string;
    teamName: string;
    memberName: string;
    memberRegNo: string;
    memberIdCardUrl: string;
    isLeader: boolean;
    accommodation: { mar11: boolean; mar13: boolean };
    collegeName: string;
}

export default function HackathonPassPage({ params }: { params: Promise<{ token: string }> }) {
    const resolvedParams = React.use(params);
    const [pass, setPass] = React.useState<PassData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [retryCount, setRetryCount] = React.useState(0);

    React.useEffect(() => {
        const fetchPass = async () => {
            setLoading(true);
            setError('');
            try {
                const q = query(
                    collection(db, 'hackathon_passes'),
                    where('token', '==', resolvedParams.token)
                );
                const snap = await getDocs(q);

                if (snap.empty) {
                    setError('Pass not found. Your pass may still be generating — please try again in a moment.');
                    setLoading(false);
                    return;
                }

                setPass(snap.docs[0].data() as PassData);
            } catch (err: any) {
                console.error('[PassPage] Error fetching pass:', err);
                const msg = err?.code === 'permission-denied'
                    ? 'Permission denied. Please contact support at aadhrita@mvgrce.edu.in'
                    : `Failed to load pass (${err?.code || err?.message || 'unknown error'}). Please try again.`;
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchPass();
    }, [resolvedParams.token, retryCount]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <CoinLoader text="Verifying Pass..." />
            </div>
        );
    }

    if (error || !pass) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-8 text-center max-w-sm w-full">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Pass Not Found</h2>
                    <p className="text-neutral-400 text-sm mb-6">{error || 'This pass token does not exist.'}</p>
                    <button
                        onClick={() => setRetryCount(c => c + 1)}
                        className="flex items-center gap-2 mx-auto bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const passUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/pass/${pass.token}`
        : '';

    const hasAccom = pass.accommodation?.mar11 || pass.accommodation?.mar13;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-sm">
                {/* Pass Card */}
                <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">

                    {/* Top Gold Bar */}
                    <div className="h-1.5 bg-gradient-to-r from-yellow-700 via-[#D4AF37] to-yellow-700" />

                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.3em]">Hackathon Pass</span>
                            <Shield className="w-4 h-4 text-[#D4AF37]" />
                        </div>
                        <h1 className={cn("text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e1c] uppercase tracking-tight", cinzel.className)}>
                            AADHRITA 2026
                        </h1>
                        {/* 2-day entry badge */}
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-green-900/40 border border-green-500/40 rounded-full px-3 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">2-Day Entry Pass</span>
                        </div>
                        <p className="text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">12<sup>th</sup> &amp; 13<sup>th</sup> March 2026 · Grand Finale</p>
                    </div>

                    {/* Perforated Line */}
                    <div className="flex items-center px-4">
                        <div className="w-4 h-8 bg-black rounded-r-full -ml-4" />
                        <div className="flex-1 border-t-2 border-dashed border-white/10 mx-2" />
                        <div className="w-4 h-8 bg-black rounded-l-full -mr-4" />
                    </div>

                    {/* Member Info */}
                    <div className="px-6 py-5">
                        <div className="flex items-center gap-4 mb-5">
                            {/* Photo */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#D4AF37]/30 shadow-lg shadow-yellow-500/10 shrink-0 bg-neutral-800">
                                {pass.memberIdCardUrl ? (
                                    <img src={pass.memberIdCardUrl} alt={pass.memberName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-2xl font-bold">
                                        {pass.memberName.charAt(0)}
                                    </div>
                                )}
                            </div>
                            {/* Name & Details */}
                            <div className="min-w-0">
                                <p className="text-lg font-bold text-white leading-tight truncate">{pass.memberName}</p>
                                <p className="text-xs font-mono text-neutral-500 mt-0.5">{pass.memberRegNo}</p>
                                {pass.isLeader && (
                                    <span className="inline-block mt-1.5 text-[9px] font-bold uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/20 tracking-wider">
                                        Team Leader
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Team & College */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Team</p>
                                <p className="text-sm font-bold text-white truncate">{pass.teamName}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">College</p>
                                <p className="text-sm font-bold text-white truncate">{pass.collegeName}</p>
                            </div>
                        </div>

                        {/* Accommodation */}
                        {hasAccom && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mb-5 flex gap-3 items-start">
                                <BedDouble className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">Accommodation</p>
                                    <p className="text-sm text-blue-200 font-medium">
                                        {[pass.accommodation?.mar11 && '11th March', pass.accommodation?.mar13 && '13th March'].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Perforated Line */}
                    <div className="flex items-center px-4">
                        <div className="w-4 h-8 bg-black rounded-r-full -ml-4" />
                        <div className="flex-1 border-t-2 border-dashed border-white/10 mx-2" />
                        <div className="w-4 h-8 bg-black rounded-l-full -mr-4" />
                    </div>

                    {/* QR Code */}
                    <div className="px-6 py-6 text-center">
                        <div className="inline-block bg-white p-3 rounded-xl shadow-2xl shadow-black/50">
                            <QRCodeSVG
                                value={passUrl}
                                size={160}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <p className="text-[9px] text-neutral-600 mt-3 font-mono">
                            {pass.token.substring(0, 8)}...{pass.token.substring(pass.token.length - 4)}
                        </p>
                    </div>

                    {/* Bottom Bar */}
                    <div className="h-1.5 bg-gradient-to-r from-yellow-700 via-[#D4AF37] to-yellow-700" />
                </div>

                {/* Footer Note */}
                <p className="text-center text-[10px] text-neutral-700 mt-4">
                    Present this pass at the venue for entry. Do not share your QR code.
                </p>
            </div>
        </div>
    );
}

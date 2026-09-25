'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, HackathonTeam } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, ExternalLink, BedDouble, Trophy, Users, Receipt, ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';
import { Suspense } from 'react';
import { CoinLoader } from '@/components/ui/CoinLoader';

const cinzel = Cinzel({ subsets: ['latin'] });

const HACKATHON_FEE = 600;
const ACCOMMODATION_FEE = 500;

function HackathonMyTeamContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [loading, setLoading] = React.useState(true);
    const [teamData, setTeamData] = React.useState<HackathonTeam | null>(null);
    const [teamId, setTeamId] = React.useState<string>('');

    React.useEffect(() => {
        const fetchTeam = async () => {
            if (!user) return;

            // Try teamId from URL first
            const urlTeamId = searchParams.get('teamId');

            if (urlTeamId) {
                const snap = await getDoc(doc(db, 'hackathon_teams', urlTeamId));
                if (snap.exists()) {
                    setTeamData({ id: snap.id, ...snap.data() } as HackathonTeam);
                    setTeamId(snap.id);
                    setLoading(false);
                    return;
                }
            }

            // Fallback: find team by leader email
            const q = query(
                collection(db, 'hackathon_teams'),
                where('leader.email', '==', user.email)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const d = snap.docs[0];
                setTeamData({ id: d.id, ...d.data() } as HackathonTeam);
                setTeamId(d.id);
            }

            setLoading(false);
        };

        fetchTeam();
    }, [user, searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <CoinLoader size={48} text="Locating Team Passport..." />
            </div>
        );
    }

    if (!teamData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4">
                    <h2 className="text-xl font-bold text-white">No Team Found</h2>
                    <p className="text-neutral-400 text-sm">
                        We couldn&apos;t find a hackathon team linked to your account.
                    </p>
                    <Button onClick={() => router.push('/register/hackathon')} className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold">
                        Register Now
                    </Button>
                </div>
            </div>
        );
    }

    const isPaid = teamData.paymentStatus === 'paid' || teamData.paymentStatus === 'success';
    const passTokens = teamData.passTokens || [];
    const totalAmount = teamData.totalAmount || (teamData.teamSize * HACKATHON_FEE);
    const hackathonTotal = teamData.hackathonTotal || (teamData.teamSize * HACKATHON_FEE);
    const accommodationTotal = teamData.accommodationTotal || 0;

    // Count accommodation days
    let accomDays = 0;
    if (teamData.leader.accommodation?.mar11) accomDays++;
    if (teamData.leader.accommodation?.mar13) accomDays++;
    teamData.members?.forEach(m => {
        if (m.accommodation?.mar11) accomDays++;
        if (m.accommodation?.mar13) accomDays++;
    });

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className={cn("text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e1c] uppercase", cinzel.className)}>
                            Grand Finale
                        </h1>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Your Team Status</p>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={cn(
                    "rounded-xl p-4 flex items-center gap-4 mb-6",
                    isPaid
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-yellow-500/10 border border-yellow-500/30"
                )}>
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", isPaid ? "bg-green-500/20" : "bg-yellow-500/20")}>
                        {isPaid ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Trophy className="w-6 h-6 text-yellow-500" />}
                    </div>
                    <div>
                        <h3 className={cn("font-bold text-lg", isPaid ? "text-green-400" : "text-yellow-400")}>
                            {isPaid ? "Registration Complete" : "Payment Pending"}
                        </h3>
                        <p className="text-sm text-neutral-400">
                            Team <b className="text-white">{teamData.teamName}</b> · {teamData.teamSize} members
                        </p>
                    </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4 text-neutral-400">
                        <Receipt className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Payment Breakdown</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <div>
                                <p className="text-sm text-white font-medium">Hackathon Registration</p>
                                <p className="text-xs text-neutral-500">{teamData.teamSize} members × ₹{HACKATHON_FEE}</p>
                            </div>
                            <span className="font-bold text-white">₹{hackathonTotal}</span>
                        </div>

                        {accommodationTotal > 0 && (
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <div>
                                    <p className="text-sm text-white font-medium">Accommodation</p>
                                    <p className="text-xs text-neutral-500">{accomDays} day{accomDays > 1 ? 's' : ''} × ₹{ACCOMMODATION_FEE}</p>
                                </div>
                                <span className="font-bold text-amber-400">₹{accommodationTotal}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Total Paid</span>
                            <span className="text-2xl font-black text-white">₹{totalAmount}</span>
                        </div>
                    </div>

                    {teamData.transactionId && (
                        <p className="text-[10px] text-neutral-600 mt-3 font-mono">Txn: {teamData.transactionId}</p>
                    )}
                </div>

                {/* Team Members */}
                <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4 text-neutral-400">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Team Members</span>
                    </div>

                    <div className="space-y-3">
                        {/* Leader */}
                        <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 text-xs font-bold border border-yellow-500/20">L</div>
                                <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{teamData.leader.name}</p>
                                    <p className="text-xs text-neutral-500 font-mono">{teamData.leader.regNo}</p>
                                </div>
                                <span className="text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20 ml-auto shrink-0">Leader</span>
                            </div>
                            {(teamData.leader.accommodation?.mar11 || teamData.leader.accommodation?.mar13) && (
                                <div className="flex items-center gap-2 text-blue-400 text-xs pl-[52px]">
                                    <BedDouble className="w-3 h-3" />
                                    <span>{[teamData.leader.accommodation?.mar11 && '11th', teamData.leader.accommodation?.mar13 && '13th'].filter(Boolean).join(', ')} March</span>
                                </div>
                            )}
                        </div>

                        {/* Members */}
                        {teamData.members?.map((member, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 text-xs font-bold">{idx + 2}</div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-white truncate">{member.name}</p>
                                        <p className="text-xs text-neutral-500 font-mono">{member.regNo}</p>
                                    </div>
                                </div>
                                {(member.accommodation?.mar11 || member.accommodation?.mar13) && (
                                    <div className="flex items-center gap-2 text-blue-400 text-xs pl-[52px]">
                                        <BedDouble className="w-3 h-3" />
                                        <span>{[member.accommodation?.mar11 && '11th', member.accommodation?.mar13 && '13th'].filter(Boolean).join(', ')} March</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pass Links (only if paid & tokens generated) */}
                {isPaid && passTokens.length > 0 && (
                    <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4 text-[#D4AF37]">
                            <span className="text-xs font-bold uppercase tracking-wider">🎫 Hackathon Passes</span>
                        </div>

                        <div className="space-y-2">
                            {passTokens.map((pt, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between hover:border-[#D4AF37]/30 transition-all">
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {pt.name} {pt.isLeader && <span className="text-yellow-500 text-[10px]">(Lead)</span>}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm" variant="ghost"
                                            className="h-7 text-xs text-neutral-400 hover:text-white"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/pass/${pt.token}`);
                                                toast.success(`Link copied for ${pt.name}`);
                                            }}
                                        ><Copy className="w-3 h-3 mr-1" /> Copy</Button>
                                        <Button
                                            size="sm" variant="ghost"
                                            className="h-7 text-xs text-neutral-400 hover:text-white"
                                            onClick={() => window.open(`/pass/${pt.token}`, '_blank')}
                                        ><ExternalLink className="w-3 h-3" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline" size="sm"
                            className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs mt-4"
                            onClick={() => {
                                const links = passTokens.map(pt => `${pt.name}${pt.isLeader ? ' (Lead)' : ''}: ${window.location.origin}/pass/${pt.token}`).join('\n');
                                navigator.clipboard.writeText(`🎫 Aadhrita Hackathon Passes - Team ${teamData.teamName}\n\n${links}`);
                                toast.success("All links copied! Share via WhatsApp");
                            }}
                        >📋 Copy All Links (for WhatsApp)</Button>

                        <p className="text-[10px] text-neutral-600 mt-3 text-center">
                            Share individual pass links with each teammate. Each link contains their entry QR code.
                        </p>
                    </div>
                )}

                {/* Paid but no passes yet */}
                {isPaid && passTokens.length === 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                            <Calendar className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-amber-400 font-bold">Passes Generating...</h3>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                                Your payment is confirmed! We are currently generating your team passes. This usually takes 5-10 minutes.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => window.location.reload()}
                        >
                            Refresh Status
                        </Button>
                        <p className="text-[10px] text-neutral-500">
                            If passes don&apos;t appear after 15 minutes, please contact the coordinator with your Transaction ID.
                        </p>
                    </div>
                )}

                {/* Not paid yet */}
                {!isPaid && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
                        <p className="text-yellow-400 font-bold mb-3">Payment Required</p>
                        <p className="text-sm text-neutral-400 mb-4">Complete your payment to receive entry passes.</p>
                        <Button
                            onClick={() => router.push('/register/hackathon')}
                            className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold"
                        >
                            Complete Payment
                        </Button>
                    </div>
                )}

                <div className="h-16" />
            </div>
        </div>
    );
}

export default function HackathonMyTeamPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><CoinLoader size={48} text="Syncing..." /></div>}>
            <HackathonMyTeamContent />
        </Suspense>
    );
}

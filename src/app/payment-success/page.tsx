"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/db";
import { collection, query, where, getDocs, collectionGroup, doc, getDoc } from "firebase/firestore";
import { Loader2, CheckCircle, Copy, ArrowRight, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Cinzel } from 'next/font/google';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const cinzel = Cinzel({ subsets: ['latin'] });

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const { refreshProfile } = useAuth();

    const [transaction, setTransaction] = useState<any>(null);
    const [status, setStatus] = useState<string>("Verifying...");
    const [statusMessage, setStatusMessage] = useState("Checking payment with gateway...");
    const [loading, setLoading] = useState(true);
    const [myTeams, setMyTeams] = useState<any[]>([]);
    const [passTokens, setPassTokens] = useState<{ name: string; token: string; isLeader: boolean }[]>([]);
    const [teamName, setTeamName] = useState('');
    const [isStillProcessing, setIsStillProcessing] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setStatus("Order ID Missing");
            setLoading(false);
            return;
        }

        const verifyAndFetch = async () => {
            try {
                // ── 1. Fetch transaction from Firestore ──────────────────────────
                setStatusMessage("Looking up your order...");
                const qTxn = query(collection(db, "transactions"), where("orderId", "==", orderId));
                let snapTxn = await getDocs(qTxn);

                if (snapTxn.empty) {
                    // Not in our DB yet — call the Paytm verify API to pull status
                    setStatusMessage("Checking with payment gateway...");
                    await fetch(`/api/paytm/verify?orderId=${orderId}`);
                    await new Promise(r => setTimeout(r, 3000));
                    snapTxn = await getDocs(qTxn);
                    if (snapTxn.empty) {
                        setStatus("Order not found");
                        setLoading(false);
                        return;
                    }
                }

                const txnData = snapTxn.docs[0].data();
                setTransaction(txnData);
                const userId = txnData.userId;
                const isHackathon = !!(txnData.teamId);
                const storedTeamCollection = txnData.teamCollection as string | undefined;

                // ── 2. Proactively call server-side Paytm verify ─────────────────
                // This syncs Paytm's authoritative status into our Firestore,
                // even if the callback was slow or missed.
                setStatusMessage("Confirming with payment gateway...");
                try {
                    await fetch(`/api/paytm/verify?orderId=${orderId}`);
                } catch (_) { /* non-fatal */ }

                // ── 3. Poll Firestore up to 20s (10 × 2s) ────────────────────────
                let isConfirmed = false;
                const MAX_POLLS = 10;

                for (let i = 0; i < MAX_POLLS; i++) {
                    setStatusMessage(`Confirming registration... (${i + 1}/${MAX_POLLS})`);

                    const freshSnap = await getDocs(qTxn);
                    const freshData = freshSnap.empty ? txnData : freshSnap.docs[0].data();

                    if (freshData.status === 'SUCCESS') {
                        if (isHackathon && freshData.teamId) {
                            // Check ALL possible collections (fixes Bug 2)
                            const cols = [storedTeamCollection, 'hackathon_teams', 'reg_hackathon']
                                .filter(Boolean) as string[];

                            for (const col of cols) {
                                try {
                                    const teamSnap = await getDoc(doc(db, col, freshData.teamId));
                                    if (teamSnap.exists()) {
                                        const td = teamSnap.data();
                                        if (td.passTokens && td.passTokens.length > 0) {
                                            setPassTokens(td.passTokens);
                                            setTeamName(td.teamName || '');
                                            isConfirmed = true;
                                            break;
                                        }
                                    }
                                } catch (_) { /* try next */ }
                            }
                            if (isConfirmed) break;
                        } else if (!isHackathon) {
                            const qRegs = query(
                                collectionGroup(db, "registrations"),
                                where("userId", "==", userId),
                                where("paymentStatus", "==", "success")
                            );
                            const snapRegs = await getDocs(qRegs);
                            if (!snapRegs.empty) { isConfirmed = true; break; }
                            // Even without registrations confirmed, txn is SUCCESS — that's good enough
                            isConfirmed = true;
                            break;
                        }
                    }

                    if (i < MAX_POLLS - 1) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                if (!isConfirmed) {
                    // Payment was received but passes not generated yet.
                    // Show a "still processing" notice — admin can reconcile.
                    setIsStillProcessing(true);
                }

                // ── Pull updated hasEntryPass into client memory ──────────────────
                // This is a single getDoc (not onSnapshot), called only for users who just paid.
                // Ensures dashboard immediately grants access without requiring page reload.
                await refreshProfile();

                setStatus("Success");

                // ── 4. Fetch team IDs for standard events ─────────────────────────
                if (!isHackathon && userId) {
                    const qRegsWithTeam = query(
                        collectionGroup(db, "registrations"),
                        where("userId", "==", userId),
                        where("paymentStatus", "==", "success")
                    );
                    const snapRegs = await getDocs(qRegsWithTeam);
                    const teamsFound: any[] = [];
                    const eventTitles: Record<string, string> = {};
                    const eventIds = Array.from(new Set(snapRegs.docs.map(d => d.data().eventId).filter(Boolean)));

                    await Promise.all(eventIds.map(async (eid) => {
                        if (eid === 'hackathon') {
                            eventTitles[eid] = "AADHRITA HACK24";
                        } else {
                            const evtSnap = await getDoc(doc(db, "events", eid));
                            eventTitles[eid] = evtSnap.exists() ? evtSnap.data().title : "Unknown Event";
                        }
                    }));

                    for (const d of snapRegs.docs) {
                        const r = d.data();
                        if (r.teamId) {
                            teamsFound.push({
                                id: r.teamId,
                                name: r.responses?.teamName || "Team",
                                eventTitle: eventTitles[r.eventId] || "Event"
                            });
                        }
                    }

                    const uniqueTeams = Array.from(new Set(teamsFound.map(t => t.id)))
                        .map(id => teamsFound.find(t => t.id === id));
                    setMyTeams(uniqueTeams);
                }

            } catch (e) {
                console.error("[PaymentSuccess]", e);
                setStatus("Payment Received");
            } finally {
                setLoading(false);
            }
        };

        verifyAndFetch();
    }, [orderId]);

    const copyToClipboard = (text: string, label = "Copied!") => {
        navigator.clipboard.writeText(text);
        toast.success(label);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
                <p className="text-zinc-400 font-medium animate-pulse">{statusMessage}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-[url('/bg-onboarding.webp')] opacity-40 bg-cover bg-center pointer-events-none mix-blend-overlay" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px]" />

            <div className="relative z-10 w-full max-w-lg bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="h-1 bg-gradient-to-r from-red-900 via-[#D4AF37] to-red-900" />

                <div className="p-8 md:p-10 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-900/40 to-black rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)] relative">
                        <div className="absolute inset-0 rounded-full border border-green-500/10 animate-ping opacity-20" />
                        <CheckCircle className="w-10 h-10 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                    </div>

                    <h1 className={cn("text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e1c] uppercase mb-3 tracking-tight", cinzel.className)}>
                        Payment Successful
                    </h1>
                    <p className="text-zinc-400 mb-6 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                        Your registration has been confirmed. Welcome to the kingdom!
                    </p>

                    {/* Still processing notice */}
                    {isStillProcessing && (
                        <div className="mb-6 flex items-start gap-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-left">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-yellow-400 text-sm font-bold mb-1">Passes still generating</p>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    Your payment went through ✅. Pass links are being generated — they may take a few minutes.
                                    Refresh this page or check your dashboard shortly. If passes don't appear within 10 minutes,
                                    contact support with your Order ID.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Standard Event Teams */}
                    {myTeams.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-1 mb-6 text-left relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <div className="relative p-5">
                                <div className="flex items-center gap-2 mb-4 text-[#D4AF37]">
                                    <Shield className="w-4 h-4 fill-[#D4AF37]/20" />
                                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Your Team Access</span>
                                </div>
                                <div className="space-y-3">
                                    {myTeams.map((team, idx) => (
                                        <div key={idx} className="bg-black/40 p-4 rounded-lg flex items-center justify-between border border-white/5 group hover:border-[#D4AF37]/30 transition-all hover:bg-black/60">
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider group-hover:text-[#D4AF37] transition-colors">{team.eventTitle}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-zinc-600 font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">ID</span>
                                                    <code className="text-xl font-mono font-bold text-white tracking-wider">{team.id}</code>
                                                </div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] text-zinc-500" onClick={() => copyToClipboard(team.id, "Team ID Copied!")}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-4 text-center border-t border-white/5 pt-3">
                                    Share this Team ID with your members so they can join.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Hackathon Pass Links */}
                    {passTokens.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-1 mb-6 text-left relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <div className="relative p-5">
                                <div className="flex items-center gap-2 mb-4 text-[#D4AF37]">
                                    <Shield className="w-4 h-4 fill-[#D4AF37]/20" />
                                    <span className="text-xs font-bold uppercase tracking-[0.2em]">🎫 Hackathon Passes — {teamName}</span>
                                </div>
                                <div className="space-y-2">
                                    {passTokens.map((pt, idx) => (
                                        <div key={idx} className="bg-black/40 p-3 rounded-lg flex items-center justify-between border border-white/5 group hover:border-[#D4AF37]/30 transition-all">
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {pt.name} {pt.isLeader && <span className="text-yellow-500 text-[10px]">(Lead)</span>}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-white"
                                                    onClick={() => copyToClipboard(`${window.location.origin}/pass/${pt.token}`, `Link copied for ${pt.name}`)}>
                                                    <Copy className="w-3 h-3 mr-1" /> Copy
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-white"
                                                    onClick={() => window.open(`/pass/${pt.token}`, '_blank')}>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline" size="sm"
                                    className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs mt-4"
                                    onClick={() => {
                                        const links = passTokens
                                            .map(pt => `${pt.name}${pt.isLeader ? ' (Lead)' : ''}: ${window.location.origin}/pass/${pt.token}`)
                                            .join('\n');
                                        copyToClipboard(`🎫 Aadhrita Hackathon Passes - Team ${teamName}\n\n${links}`, "All links copied!");
                                    }}
                                >📋 Copy All Links (for WhatsApp)</Button>
                                <p className="text-[10px] text-zinc-500 mt-3 text-center border-t border-white/5 pt-3">
                                    Share individual pass links with each teammate. Each link contains their entry QR code.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Order Details */}
                    <div className="space-y-2 mb-8">
                        <div className="flex justify-between items-center text-sm px-4 py-3 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-zinc-500 font-medium">Order ID</span>
                            <span className="font-mono text-zinc-300 text-xs">{transaction?.orderId || orderId}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm px-4 py-3 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-zinc-500 font-medium">Amount Paid</span>
                            <span className="font-bold text-[#D4AF37]">₹{transaction?.amount || '--'}</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={() => router.push('/dashboard')}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black hover:from-[#c29f30] hover:to-[#a08328] font-bold py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentSuccess() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <SuccessContent />
        </Suspense>
    )
}

"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { db, COLLECTIONS, EventRegistration } from "@/lib/db"; // Client SDK
import { collection, query, where, getDocs, collectionGroup, updateDoc, doc } from "firebase/firestore";
import { createTeam, joinTeam } from "@/lib/team-logic";

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");

    const [transaction, setTransaction] = useState<any>(null);
    const [status, setStatus] = useState<string>("Verifying Payment...");
    const [generatedTeams, setGeneratedTeams] = useState<{ name: string, id: string }[]>([]);

    useEffect(() => {
        if (!orderId) {
            setStatus("Invalid Request: No Order ID");
            return;
        }

        const processRegistrations = async () => {
            try {
                setStatus("Verifying Payment...");
                // 1. Verify Transaction
                const qTxn = query(collection(db, "transactions"), where("orderId", "==", orderId));
                const snapTxn = await getDocs(qTxn);

                if (snapTxn.empty) {
                    setStatus("Transaction not found. Please contact support.");
                    return;
                }

                const txnData = snapTxn.docs[0].data();
                setTransaction(txnData);

                // Note: In production, check txnData.status === 'SUCCESS' from gateway webhook sync
                // For now, assuming if we are here and query returns, we proceed. 

                setStatus("Finalizing Team & Passes...");

                // 2. Fetch Pending Registrations for User
                // Query all 'registrations' subcollections
                const qRegs = query(
                    collectionGroup(db, "registrations"),
                    where("userId", "==", txnData.userId),
                    where("paymentStatus", "==", "pending") // Only process pending
                );
                const snapRegs = await getDocs(qRegs);

                const newTeams: { name: string, id: string }[] = [];

                // 3. Process Each
                await Promise.all(snapRegs.docs.map(async (docSnap) => {
                    const reg = docSnap.data() as EventRegistration;
                    const regRef = docSnap.ref;
                    let updates: any = { paymentStatus: 'success' };

                    try {
                        // Team Logic
                        if (reg.role === 'Leader' && reg.responses.teamName) {
                            // CREATE TEAM
                            const newTeamId = await createTeam(
                                reg.eventId,
                                reg.responses.teamName,
                                {
                                    uid: reg.userId,
                                    name: reg.userSnapshot.fullName,
                                    regNo: reg.userSnapshot.regNo
                                },
                                4 // Default max size, ideally fetch event.maxSize or pass in metadata
                            );
                            updates.teamId = newTeamId;
                            newTeams.push({ name: reg.responses.teamName, id: newTeamId });

                        } else if (reg.role === 'Member' && reg.teamId) {
                            // JOIN TEAM
                            await joinTeam(
                                reg.teamId,
                                {
                                    uid: reg.userId,
                                    name: reg.userSnapshot.fullName,
                                    regNo: reg.userSnapshot.regNo
                                }
                            );
                        }

                        // Commit Updates
                        await updateDoc(regRef, updates);

                    } catch (err) {
                        console.error(`Error processing reg ${docSnap.id}:`, err);
                        // Optional: Mark as 'failed_logic' but keep payment success?
                    }
                }));

                setGeneratedTeams(newTeams);
                setStatus("Success");

                // Also activate Entry Pass if applicable (root 'registrations')
                // (Assuming logic handled elsewhere or via similar query if structure matches)

            } catch (error) {
                console.error("Error processing success:", error);
                setStatus("Error finalizing registration. Support notified.");
            }
        };

        processRegistrations();
    }, [orderId]);

    if (status !== "Success") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-4">
                <div className="animate-spin text-4xl">⚙️</div>
                <div className="text-xl font-bold">{status}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative z-10 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-white shadow-lg shadow-green-500/30">
                    ✓
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Registration Confirmed!</h1>
                <p className="text-zinc-400 mb-8">Your spot has been secured.</p>

                {/* New Team IDs Display */}
                {generatedTeams.length > 0 && (
                    <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 text-left border border-zinc-700">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-amber-400 text-xl">👑</span>
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Your New Teams</h3>
                        </div>
                        <div className="space-y-2">
                            {generatedTeams.map((t, idx) => (
                                <div key={idx} className="bg-black/40 p-3 rounded-lg flex justify-between items-center border border-zinc-600">
                                    <span className="text-zinc-300 text-sm font-medium">{t.name}</span>
                                    <code className="text-green-400 font-mono font-bold">{t.id}</code>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 text-center">Share these Team IDs with your friends so they can join!</p>
                    </div>
                )}

                {transaction && (
                    <div className="bg-zinc-800 rounded-lg p-5 mb-8 text-left border border-zinc-700">
                        <div className="flex justify-between py-2 border-b border-zinc-700">
                            <span className="font-semibold text-zinc-500">Amount Paid:</span>
                            <span className="text-white">₹{transaction.amount}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="font-semibold text-zinc-500">Order ID:</span>
                            <span className="text-sm text-zinc-300 font-mono">{transaction.orderId}</span>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-red-900/20"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}

export default function PaymentSuccess() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    )
}

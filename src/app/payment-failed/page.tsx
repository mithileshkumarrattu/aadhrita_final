"use client";

import { ArrowLeft, AlertTriangle, RefreshCw, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Cinzel } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const cinzel = Cinzel({ subsets: ["latin"] });

function FailedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const eventId = searchParams.get("eventId");

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/bg-onboarding.webp')] bg-cover bg-center opacity-30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

            <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.2)] max-w-lg w-full text-center relative z-10 overflow-hidden">
                {/* Top decorative bar */}
                <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

                <div className="p-8 md:p-12">
                    <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-in zoom-in duration-500">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>

                    <h1 className={cn("text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-white to-red-400 mb-2", cinzel.className)}>
                        Payment Failed
                    </h1>

                    <p className="text-neutral-400 mb-8 leading-relaxed">
                        We couldn't process your payment. This usually happens due to network issues or bank downtime.
                    </p>

                    <div className="bg-white/5 rounded-xl p-5 mb-8 text-left border border-white/10">
                        <p className="text-neutral-200 font-bold text-sm mb-3 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-neutral-500" /> Troubleshooting Tips:
                        </p>
                        <ul className="list-disc list-inside text-neutral-400 space-y-2 text-xs">
                            <li>Check your internet connection.</li>
                            <li>Ensure sufficient balance in your account.</li>
                            <li>Try a different UPI app (GPay / PhonePe).</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                // Route back to the correct registration page based on order prefix
                                if (orderId?.startsWith('FF-')) {
                                    router.push('/enrollment/freefire');
                                } else if (orderId?.startsWith('HACK_')) {
                                    router.push('/register/hackathon');
                                } else if (orderId?.startsWith('EVT_') && eventId) {
                                    router.push(`/events/${eventId}/register`);
                                } else if (orderId?.startsWith('EVT_')) {
                                    router.push('/dashboard');
                                } else {
                                    router.push('/register/onboarding');
                                }
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform" /> Try Payment Again
                        </button>

                        <Link href="/support" className="w-full">
                            <button className="w-full bg-white/10 hover:bg-white/20 text-amber-400 font-medium py-3 px-4 rounded-xl transition-colors border border-white/5 flex items-center justify-center gap-2">
                                <HelpCircle className="w-4 h-4" /> Need Help? Contact Support
                            </button>
                        </Link>
                    </div>

                    {orderId && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-mono">
                                Transaction Ref: <span className="text-neutral-500 select-all">{orderId}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PaymentFailed() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <FailedContent />
        </Suspense>
    )
}

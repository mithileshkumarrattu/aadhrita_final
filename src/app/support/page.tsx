'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Mail, Phone, MessageSquare, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';
import { Button } from '@/components/ui/button';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-red-500/30">
            {/* Background Texture */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-[url('/bg-onboarding.webp')] bg-cover bg-center" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <Link href="/" className="inline-flex items-center text-neutral-500 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                    </Link>
                    <h1 className={cn("text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] tracking-tighter", cinzel.className)}>
                        Help Center
                    </h1>
                    <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
                        Need assistance with Aadhrita? We are here to help you.
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-16">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors group">
                        <Mail className="w-10 h-10 text-red-500 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className={cn("text-2xl font-bold text-white mb-2", cinzel.className)}>Email Support</h3>
                        <p className="text-neutral-400 mb-4">For general queries and payment issues.</p>
                        <a href="mailto:support.aadhrita@mvgrce.edu.in" className="text-red-400 hover:text-red-300 font-medium">support.aadhrita@mvgrce.edu.in</a>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors group">
                        <Phone className="w-10 h-10 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className={cn("text-2xl font-bold text-white mb-2", cinzel.className)}>Helpline</h3>
                        <p className="text-neutral-400 mb-4"> For any queries contact </p>
                        <p className="text-neutral-400 mb-4"> M.LIKITH KUMAR (STUDENT CO-ORDINATOR)</p>
                        <a href="tel:+919010432006" className="text-amber-400 hover:text-amber-300 font-medium">+91 9010432006</a>
                    </div>
                </div>

                {/* Technical Support Section */}
                <div className="mb-16">
                    <h2 className={cn("text-2xl font-bold text-white mb-6 flex items-center gap-2", cinzel.className)}>
                        <MessageSquare className="w-6 h-6 text-blue-500" /> Technical Support
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors flex flex-col gap-2">
                            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Technical Support</span>
                            <h3 className="text-xl font-bold text-white">Methelesh Kumar</h3>
                            <a href="tel:8333841335" className="text-neutral-300 hover:text-white font-mono text-lg">83338 41335</a>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors flex flex-col gap-2">
                            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Technical Support</span>
                            <h3 className="text-xl font-bold text-white">Sarthak</h3>
                            <a href="tel:6304372629" className="text-neutral-300 hover:text-white font-mono text-lg">63043 72629</a>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors flex flex-col gap-2">
                            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Student Co-ordinator</span>
                            <h3 className="text-xl font-bold text-white">NIKHIL</h3>
                            <a href="tel:8328471504" className="text-neutral-300 hover:text-white font-mono text-lg">83284 71504</a>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-8">
                    <h2 className={cn("text-3xl font-bold text-center text-white mb-8 flex items-center justify-center gap-3", cinzel.className)}>
                        <HelpCircle className="w-8 h-8 text-neutral-600" /> Frequently Asked Questions
                    </h2>

                    <div className="space-y-4">
                        <FaqItem
                            question="Is there an entry fee?"
                            answer="Yes, the registration fee is ₹200 for MVGR students and ₹300 for non-MVGR students. This includes an Entry Pass to the festival. Additional technical events cost ₹100 each."
                        />
                        <FaqItem
                            question="My payment failed but amount was deducted. What to do?"
                            answer="Don't worry. If the amount was deducted, it is usually refunded automatically within 5-7 business days. If not, please email us with your Order ID and Transaction screenshot."
                        />
                        <FaqItem
                            question="How do I download my Event Pass?"
                            answer="Once registered successfully, your pass will be available on your Dashboard. You can show the QR code at the event entrance."
                        />
                        <FaqItem
                            question="Can I register for multiple events?"
                            answer="Yes! You can add multiple events during registration or later from your Dashboard. Each additional technical event costs ₹100."
                        />
                        <FaqItem
                            question="Is accommodation available?"
                            answer="Yes, accommodation is available for non-local students at ₹500/day (including food). You can select this option during registration."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    return (
        <details className="group bg-neutral-900/50 border border-white/5 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors select-none">
                <h3 className="font-bold text-lg text-neutral-200">{question}</h3>
                <ChevronDown className="w-5 h-5 text-neutral-500 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-6 pb-6 text-neutral-400 leading-relaxed border-t border-white/5 pt-4">
                {answer}
            </div>
        </details>
    );
}

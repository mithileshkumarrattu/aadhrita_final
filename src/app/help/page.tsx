'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';
import { Button } from '@/components/ui/button';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function HelpPage() {
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
                        Find answers to common questions or reach out to our team.
                    </p>
                </div>

                {/* FAQ Section */}
                <div className="space-y-8 mb-16">
                    <h2 className={cn("text-3xl font-bold text-center text-white mb-8 flex items-center justify-center gap-3", cinzel.className)}>
                        <HelpCircle className="w-8 h-8 text-neutral-600" /> Frequently Asked Questions
                    </h2>

                    <div className="space-y-4">
                        <FaqItem
                            question="How do I register for Aadhrita 2026?"
                            answer="Click on the 'Get Entry Pass' button on the home page. You'll need to sign in with Google and complete a simple onboarding form. Once done, you can proceed to event enrollment."
                        />
                        <FaqItem
                            question="Is there an entry fee?"
                            answer="Yes, the registration fee is ₹200 for MVGR students and ₹300 for non-MVGR students. This includes an Entry Pass to the festival. Additional technical events cost ₹100 each."
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
                            question="I registered for the Hackathon but didn't get a confirmation."
                            answer="Check your dashboard for registration status. Status updates (Shortlisted/Pending) will be reflected there. You will also receive email notifications for major updates."
                        />
                        <FaqItem
                            question="Who do I contact for payment issues?"
                            answer="Please email support.aadhrita@mvgrce.edu.in or contact our technical support team listed below."
                        />
                    </div>
                </div>

                {/* Technical Support Section (Synced from Support) */}
                <div className="mb-16">
                    <h2 className={cn("text-2xl font-bold text-white mb-6 flex items-center gap-2", cinzel.className)}>
                        <HelpCircle className="w-6 h-6 text-blue-500" /> Technical Support
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

                {/* Contact CTA */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl text-center">
                    <h2 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>Still need help?</h2>
                    <p className="text-neutral-400 mb-6">Our support team is available mon-sat, 9am - 6pm.</p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <Link href="/support">
                            <Button variant="outline" className="border-white/10 hover:bg-white/10 text-white min-w-[150px]">
                                Contact Support
                            </Button>
                        </Link>
                        <a href="mailto:support.aadhrita@mvgrce.edu.in">
                            <Button className="bg-red-600 hover:bg-red-700 text-white min-w-[150px]">
                                <Mail className="w-4 h-4 mr-2" /> Email Us
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-20 text-center border-t border-white/10 pt-10">
                    <p className="text-neutral-500 mb-6">Ready to explore?</p>
                    <Link href="/">
                        <Button className="bg-white text-black hover:bg-neutral-200 font-bold rounded-full px-8 py-6 text-lg">
                            Go Home <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                        </Button>
                    </Link>
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

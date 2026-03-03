'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

const sections = [
    {
        title: '1. Respect & Inclusivity',
        items: [
            'Treat all participants, volunteers, judges, and staff with respect.',
            'Harassment, discrimination, or bullying of any kind — based on gender, race, religion, disability, age, or background — will not be tolerated.',
            'Use inclusive and professional language at all times.',
        ],
    },
    {
        title: '2. Fair Play & Integrity',
        items: [
            'All submitted work must be your own. Plagiarism, copying, or misrepresenting others\' work is strictly prohibited.',
            'Do not use any unfair means, cheat, or attempt to manipulate results.',
            'Pre-built complete projects submitted as hackathon work are not allowed.',
            'Use of open-source libraries and publicly available APIs is permitted but must be disclosed.',
        ],
    },
    {
        title: '3. Appropriate Behaviour',
        items: [
            'Do not engage in any activity that disrupts the event, damages property, or creates a hostile environment.',
            'Any illegal activities, including unauthorized access to systems, networks, or data, are strictly forbidden.',
            'Alcohol, drugs, or any intoxicating substances are not permitted on campus.',
            'Smoking is not allowed inside college premises.',
        ],
    },
    {
        title: '4. Privacy & Data',
        items: [
            'Respect the privacy of other participants. Do not collect or share others\' personal information without consent.',
            'Any project built during the event that uses personal data must handle that data responsibly and lawfully.',
            'Do not intentionally access, alter, or destroy data that does not belong to you.',
        ],
    },
    {
        title: '5. Venue & Property',
        items: [
            'Take care of all venue property, equipment, and facilities.',
            'Keep your workspace clean and tidy.',
            'Report any damage or safety concerns to event staff immediately.',
        ],
    },
    {
        title: '6. Event Rules & Decisions',
        items: [
            'All participants must follow the specific rules of each event or competition they participate in.',
            'Decisions made by judges, coordinators, and organizers are final.',
            'Disputes should be raised through official channels — approach the event coordinators calmly.',
        ],
    },
    {
        title: '7. Digital & Online Conduct',
        items: [
            'Conduct yourself professionally on all digital platforms associated with Aadhrita.',
            'Do not post content that is offensive, misleading, or harmful on social media related to the event.',
            'Unauthorized recording or photographing of restricted areas or individuals is not allowed.',
        ],
    },
    {
        title: '8. Consequences',
        items: [
            'Violations of this Code of Conduct may result in immediate disqualification from events.',
            'Participants may be asked to leave the venue without a refund.',
            'Serious violations may be reported to college authorities or law enforcement.',
            'The organizers reserve the right to take any action deemed appropriate.',
        ],
    },
];

export default function CodeOfConductPage() {
    return (
        <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-red-500/30">
            {/* Background */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-[url('/bg-onboarding.webp')] bg-cover bg-center" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
                {/* Header */}
                <div className="text-center mb-14 space-y-4">
                    <Link href="/" className="inline-flex items-center text-neutral-500 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                    </Link>
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                        <ShieldCheck className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className={cn('text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] tracking-tighter', cinzel.className)}>
                        Code of Conduct
                    </h1>
                    <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
                        Aadhrita is committed to providing a safe, respectful, and inclusive environment for all participants. By attending, you agree to abide by the following code of conduct.
                    </p>
                    <div className="inline-block bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                        Applies to all participants, volunteers & staff
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-6">
                    {sections.map((section, i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
                            <h2 className={cn('text-lg font-black text-white mb-4', cinzel.className)}>
                                {section.title}
                            </h2>
                            <ul className="space-y-2">
                                {section.items.map((item, j) => (
                                    <li key={j} className="flex gap-3 text-neutral-400 text-sm leading-relaxed">
                                        <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="mt-12 bg-amber-950/30 border border-amber-500/20 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-amber-400 font-bold">Questions or concerns?</p>
                    <p className="text-neutral-400 text-sm">
                        Contact our team at{' '}
                        <a href="mailto:helpdesk@mvgrce.edu.in" className="text-amber-400 hover:underline">helpdesk@mvgrce.edu.in</a>
                        {' '}or call{' '}
                        <a href="tel:08922241749" className="text-amber-400 hover:underline">08922-241749</a>
                    </p>
                    <p className="text-neutral-600 text-xs mt-2">
                        Aadhrita is an event by MAHARAJ VIJAYARAM GAJAPATHI RAJ COLLEGE OF ENGINEERING, Vizianagaram
                    </p>
                </div>
            </div>
        </div>
    );
}

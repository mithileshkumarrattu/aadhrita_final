'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function PrivacyPolicyPage() {
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
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className={cn('text-4xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] tracking-tighter', cinzel.className)}>
                        Aadhrita Privacy Policy
                    </h1>
                    <p className="text-neutral-500 text-sm">Last updated: February 2026</p>
                </div>

                <div className="space-y-10 text-sm text-neutral-400 leading-relaxed">

                    {/* Section 1 */}
                    <Section title="1. Introduction">
                        <p>Welcome to Aadhrita, the official website of the Aadhrita fest ("Event", "we", "us", or "our"). This Privacy Policy explains how we collect, use, disclose, and protect personal information of visitors and participants ("you" or "users") when you use our website and related services.</p>
                        <p className="mt-2">By accessing or using the Aadhrita website, you agree to the practices described in this Privacy Policy.</p>
                    </Section>

                    {/* Section 2 */}
                    <Section title="2. Who We Are and Contact Details">
                        <div className="space-y-1">
                            <p><span className="text-white font-semibold">Organizer:</span> MAHARAJ VIJAYARAM GAJAPATHI RAJ COLLEGE OF ENGINEERING</p>
                            <p><span className="text-white font-semibold">Event:</span> Aadhrita Fest</p>
                            <p><span className="text-white font-semibold">Location:</span> Vijayaram Nagar campus, Chintalavalasa, Vizianagaram, Andhra Pradesh 535005</p>
                            <p><span className="text-white font-semibold">Email:</span> <a href="mailto:helpdesk@mvgrce.edu.in" className="text-red-400 hover:underline">helpdesk@mvgrce.edu.in</a></p>
                            <p><span className="text-white font-semibold">Phone:</span> <a href="tel:08922241749" className="text-red-400 hover:underline">08922-241749</a></p>
                        </div>
                        <p className="mt-2">If you have any questions about this Privacy Policy or your personal data, you can contact us using the details above.</p>
                    </Section>

                    {/* Section 3 */}
                    <Section title="3. Personal Data You Provide">
                        <p>We may collect the following information when you interact with our website or the event:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'Name (first and last)',
                                'Email address',
                                'Mobile/phone number',
                                'College/Institution name and department',
                                'Year/Branch of study',
                                'City and state',
                                'Event registrations (which events you join, team details)',
                                'ID card details and ID card photo that you upload for verification purposes',
                                'Payment-related information (only as needed to process registration fees; card/bank details are usually handled by our payment gateway, not stored by us)',
                                'Any information you submit through contact forms, feedback forms, or support requests',
                                'Any content you voluntarily submit (project abstracts, portfolios, etc.)',
                                'Details of your Aadhrita Fest Tokens / Aadhrita Coins balance and related transactions',
                                'The unique wallet address automatically created and assigned to your account when you log in',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Section>

                    {/* Section 4 */}
                    <Section title="4. Data Collected Automatically">
                        <p>When you visit our website, certain data may be collected automatically, such as:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'IP address',
                                'Browser type and version',
                                'Device information (device type, operating system)',
                                'Pages visited, time spent on pages',
                                'Referring website/URL',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2">We may also use cookies and similar technologies for analytics and basic functionality.</p>
                    </Section>

                    {/* Section 5 */}
                    <Section title="5. Data from Third Parties">
                        <p>We may receive limited information about you from third-party services we use, such as:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'Payment gateways (confirmation of payment status, transaction ID, amount)',
                                'Email/communication tools (delivery status, open rates)',
                                'Event management/registration platforms (your registration details if you sign up through them)',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Section>

                    {/* Section 6 */}
                    <Section title="6. How We Use Your Information">
                        <p>We use your personal data for the following purposes:</p>
                        <ol className="mt-2 space-y-2 pl-4 list-decimal">
                            <li>To register you for Aadhrita events, workshops, competitions, and related activities, including generating entry passes.</li>
                            <li>To verify your identity using the details and ID card photo you provide.</li>
                            <li>To process payments and maintain records of registrations and transactions for:
                                <ul className="pl-4 mt-1 space-y-0.5">
                                    <li className="flex gap-2"><span className="text-red-500 shrink-0">•</span>Entry pass registration (currently ₹200 per person)</li>
                                    <li className="flex gap-2"><span className="text-red-500 shrink-0">•</span>Subsequent event participation fees (currently ₹100 per event or as specified)</li>
                                    <li className="flex gap-2"><span className="text-red-500 shrink-0">•</span>Hackathon participation (currently ₹600 per team/participant)</li>
                                    <li className="flex gap-2"><span className="text-red-500 shrink-0">•</span>Accommodation fees (currently ₹500 per day per person)</li>
                                </ul>
                            </li>
                            <li>To create, allocate, track, and manage Aadhrita Fest Tokens / Aadhrita Coins.</li>
                            <li>To communicate with you about schedules, updates, changes, and important notices related to Aadhrita.</li>
                            <li>To create and manage participant lists, certificates, leaderboards, and results.</li>
                            <li>To respond to your queries, feedback, or support requests.</li>
                            <li>To send you information about future editions of Aadhrita or related events, if you have opted in.</li>
                            <li>To improve our website, user experience, and event planning using aggregated analytics.</li>
                            <li>To ensure security, prevent fraud, and comply with legal obligations.</li>
                        </ol>
                    </Section>

                    {/* Section 7 */}
                    <Section title="7. Legal Basis and Consent">
                        <p>Where required by applicable laws, we may rely on consent, performance of a contract, compliance with legal obligations, or our legitimate interests as legal bases for processing your data.</p>
                        <p className="mt-2">You may withdraw your consent at any time where consent is the basis of processing, using the contact details provided above.</p>
                    </Section>

                    {/* Section 8 */}
                    <Section title="8. Cookies and Tracking Technologies">
                        <p>We may use cookies, pixels, and similar technologies to:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'Remember your preferences and session',
                                'Keep you logged in for the duration of your visit (if applicable)',
                                'Analyze traffic and usage patterns',
                                'Improve performance and usability of the website',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2">You can control or disable cookies through your browser settings, but some features may not function properly if certain cookies are disabled.</p>
                    </Section>

                    {/* Section 9 */}
                    <Section title="9. Sharing and Disclosure of Information">
                        <p className="font-semibold text-white mb-2">We do not sell your personal information.</p>
                        <p>We may share your data with:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'Service providers who help us operate the event and website (hosting, email, payment gateways, event or ticketing tools)',
                                'Event partners or sponsors where necessary and, where required by law, only with your specific consent',
                                'College/Institution authorities for administrative or reporting purposes',
                                'Government or law enforcement where required to comply with applicable law',
                                'Other participants or the public where you choose to display certain information (e.g., winner lists, public leaderboards)',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Section>

                    {/* Section 10 */}
                    <Section title="10. International Transfers">
                        <p>If our servers, service providers, or tools are located outside your country, your data may be transferred and processed in those countries, which may have different data protection laws. Where required, we will take reasonable measures to ensure compliance with applicable legal requirements.</p>
                    </Section>

                    {/* Section 11 */}
                    <Section title="11. Data Retention">
                        <p>We retain your personal information only for as long as necessary to:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'Organize and complete the Aadhrita fest and related post-event activities',
                                'Maintain Aadhrita Fest Token / Aadhrita Coin and wallet records for the duration of the program',
                                'Fulfill legal, accounting, or reporting requirements',
                                'Maintain participation records for a reasonable period unless you request deletion',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Section>

                    {/* Section 12 */}
                    <Section title="12. Data Security">
                        <p>We use reasonable technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction, such as access controls and secure servers.</p>
                        <p className="mt-2">However, no method of transmission over the internet or method of electronic storage is completely secure, so we cannot guarantee absolute security.</p>
                    </Section>

                    {/* Section 13 */}
                    <Section title="13. Your Rights">
                        <p>Depending on your location and applicable laws, you may have some or all of the following rights:</p>
                        <ul className="mt-2 space-y-1 pl-4">
                            {[
                                'Right to access: Request a copy of the personal data we hold about you',
                                'Right to rectification: Request correction of inaccurate or incomplete data',
                                'Right to deletion: Request deletion of your personal data in certain circumstances',
                                'Right to restriction: Request that we limit how we use your data',
                                'Right to object: Object to certain types of processing (e.g., direct marketing)',
                                'Right to data portability: Request your data in a structured, commonly used format',
                                'Right to withdraw consent: Where we rely on consent, you can withdraw it at any time',
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2">To exercise these rights, contact us at <a href="mailto:helpdesk@mvgrce.edu.in" className="text-red-400 hover:underline">helpdesk@mvgrce.edu.in</a>.</p>
                    </Section>

                    {/* Section 14 */}
                    <Section title="14. Children&apos;s Privacy">
                        <p>Our event and website are generally intended for college/university students and young adults. If we knowingly collect personal data from individuals considered minors under applicable law, we will do so only with appropriate consent.</p>
                        <p className="mt-2">If you believe we have collected personal data from a child without proper consent, please contact us so we can take appropriate action.</p>
                    </Section>

                    {/* Section 15 */}
                    <Section title="15. Third-Party Websites and Links">
                        <p>Our website may contain links to third-party websites such as payment gateways, sponsor pages, social media platforms, or external registration tools. We are not responsible for the privacy practices or content of those third-party sites and encourage you to read their privacy policies when you visit them.</p>
                    </Section>

                    {/* Section 16 */}
                    <Section title="16. Updates to This Privacy Policy">
                        <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, token/coin and wallet features, or legal requirements, and we may notify you through the website or email where appropriate.</p>
                        <p className="mt-2">Your continued use of the Aadhrita website after any changes to this policy constitutes acceptance of the updated terms.</p>
                    </Section>

                    {/* Contact Footer */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
                        <h3 className={cn('text-white font-bold text-base mb-3', cinzel.className)}>Contact Us</h3>
                        <p>Email: <a href="mailto:helpdesk@mvgrce.edu.in" className="text-red-400 hover:underline">helpdesk@mvgrce.edu.in</a></p>
                        <p>Phone: <a href="tel:08922241749" className="text-red-400 hover:underline">08922-241749</a></p>
                        <p>Address: MAHARAJ VIJAYARAM GAJAPATHI RAJ COLLEGE OF ENGINEERING, Vijayaram Nagar campus, Chintalavalasa, Vizianagaram, Andhra Pradesh 535005</p>
                    </div>

                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
            <h2 className="text-base font-black text-white mb-3 pb-2 border-b border-white/10">{title}</h2>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

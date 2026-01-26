'use client';

import React from 'react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function AboutPage() {
    const router = useRouter();

    return (
        <div className={cn("min-h-screen bg-[#050505] text-white selection:bg-red-500/30")}>
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <div className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80" style={{ backgroundImage: "url('/final%20desktop.png')" }} />
                <div className="block md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70" style={{ backgroundImage: "url('/final.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-black/60" />
            </div>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-24 md:py-32">
                <Button variant="ghost" onClick={() => router.back()} className="mb-8 text-neutral-400 hover:text-white pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                <h1 className={cn("text-5xl md:text-7xl font-black uppercase mb-12 text-center text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e15]", cinzel.className)}>
                    About Us
                </h1>

                <Tabs defaultValue="mvgr" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-1 mb-12">
                        <TabsTrigger value="mvgr" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-bold uppercase tracking-wider text-xs md:text-sm py-3 rounded-lg transition-all">MVGR & MANSAS</TabsTrigger>
                        <TabsTrigger value="aadhrita" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-bold uppercase tracking-wider text-xs md:text-sm py-3 rounded-lg transition-all">Aadhrita Legacy</TabsTrigger>
                    </TabsList>

                    {/* MVGR & MANSAS CONTENT */}
                    <TabsContent value="mvgr" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded-3xl space-y-10">
                            {/* About MVGR */}
                            <div>
                                <h2 className={cn("text-3xl font-bold text-[#D4AF37] mb-6", cinzel.className)}>About MVGR College of Engineering</h2>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    Established in 1997, Maharaj Vijayaram Gajapathi Raj College of Engineering (MVGRCE) stands as a premier autonomous technological institute in Vizianagaram, Andhra Pradesh, committed to nurturing academic excellence, innovation, and societal leadership. Set on a sprawling 60+ acre campus, the institution has grown from a modest beginning to a dynamic hub of engineering education that integrates technology with purpose.
                                </p>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                    At MVGRCE, students are not just learners - they are problem-solvers, innovators, and leaders equipped to thrive in a rapidly transforming world. Through a blend of strong academics, research culture, industry collaborations, and hands-on experiences, the college strives to shape well-rounded professionals ready for global challenges.
                                </p>
                            </div>

                            {/* Vision & Legacy */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>Our Vision & Legacy</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    MVGRCE is rooted in a rich legacy of service through education, inspired by the spirit of its founding trust, Maharaja Alak Narayan Society of Arts and Science (MANSAS). The college embraces education as a force for personal transformation and societal progress, fostering a culture where students learn to innovate responsibly and lead with integrity.
                                </p>
                            </div>

                            {/* About MANSAS */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>About MANSAS Trust</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    The Maharaja Alak Narayan Society of Arts and Science (MANSAS), established in 1958, is the foundational educational trust behind MVGRCE. Founded with a profound belief in democratizing education, MANSAS has been a key driver in expanding quality learning opportunities across the region, empowering generations of students to pursue excellence, innovation, and service.
                                </p>
                            </div>

                            {/* Founders */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>Founders & Their Vision</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    The institution owes its inception to the visionary Dr. P.V.G. Raju garu, Raja Saheb of Vizianagaram, a statesman and philanthropist known for his lifelong dedication to social upliftment and educational empowerment. His legacy continues to inspire MVGRCE’s ethos and long-term mission to serve society through education.
                                </p>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                    Beyond founding the trust and college, his commitment to knowledge, humanism, and community development laid down core values that remain central to MVGRCE’s identity. His generous contributions of property and personal resources to educational causes set the tone for an institution that values service over self and scholarship over mere credentials.
                                </p>
                            </div>

                            {/* Leadership */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>Leadership & Stewardship</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mb-6">
                                    MVGR College of Engineering is guided by a leadership that blends legacy, public service, academic vision, and institutional excellence. The governance and stewardship of the institution reflect a deep commitment to education as a public good and nation-building through knowledge.
                                </p>

                                <div className="space-y-6">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <span className="block text-[#D4AF37] font-bold text-xl mb-1">Sri Pusapati Ashok Gajapathi Raju garu</span>
                                        <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Governor of Goa (2025–Present) | Chairman, MANSAS</span>
                                        <p className="text-neutral-300 text-sm mt-4 leading-loose text-justify">
                                            Pusapati Ashok Gajapathi Raju garu, a distinguished statesman and visionary educationist, currently serves as the Hon’ble Governor of Goa. With decades of experience in public administration, governance, and educational leadership, he has played a pivotal role in strengthening institutions under the MANSAS umbrella.
                                        </p>
                                        <p className="text-neutral-300 text-sm mt-4 leading-loose text-justify">
                                            His leadership philosophy emphasizes inclusive growth, ethical governance, and empowerment through education. Even while serving in high constitutional office, his enduring association with MANSAS continues to inspire MVGR’s mission of delivering value-driven, future-oriented education.
                                        </p>
                                    </div>

                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <span className="block text-[#D4AF37] font-bold text-xl mb-1">Sri P. S. Sitharama Raju garu</span>
                                        <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Director</span>
                                        <p className="text-neutral-300 text-sm mt-4 leading-loose text-justify">
                                            With over two and a half decades of experience in academia and industry, he brings strategic vision and educational insight to MVGRCE. His leadership focuses on quality assurance, curriculum innovation, and aligning academic offerings with global and industry standards.
                                        </p>
                                    </div>

                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <span className="block text-[#D4AF37] font-bold text-xl mb-1">Prof. Y.M.C. Sekhar garu</span>
                                        <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Principal</span>
                                        <p className="text-neutral-300 text-sm mt-4 leading-loose text-justify">
                                            A seasoned educator and administrator with deep roots in MVGRCE, his stewardship ensures academic rigor, operational excellence, and sustained student success across programs.
                                        </p>
                                        <p className="text-neutral-300 text-sm mt-4 leading-loose text-justify">
                                            Together with a talented team of deans, faculty, and department heads, MVGRCE’s leadership fosters a culture of collaborative learning, research exploration, and ethical professionalism.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Why MVGR */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>Why MVGRCE?</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mb-4">
                                    MVGR College of Engineering is not just an academic institution - it is a launchpad for future innovators and global citizens. Students benefit from:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4 mb-4">
                                    <li>Robust academic programs in engineering and technology</li>
                                    <li>Research and innovation ecosystems that encourage creativity</li>
                                    <li>Industry collaborations and skill development initiatives</li>
                                    <li>Vibrant campus life with cultural, technical, and leadership activities</li>
                                    <li>Strong placement support and real-world exposure</li>
                                </ul>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    This holistic environment equips learners with the tools to succeed in tomorrow’s competitive landscape - academically, professionally, and personally.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* AADHRITA CONTENT */}
                    <TabsContent value="aadhrita" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded-3xl space-y-10">

                            {/* Intro */}
                            <div>
                                <h2 className={cn("text-3xl font-bold text-[#D4AF37] mb-6", cinzel.className)}>MVGRCE & AADHRITA 2026</h2>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    Rooted in a legacy of excellence and innovation, MVGRCE proudly hosts AADHRITA 2026, a festival that embodies the institution’s ethos - inspiring intelligence, fostering creativity, and empowering change-makers. As always, AADHRITA brings together technology, culture, and impact in a festival that reflects the values and vision of MVGR College of Engineering.
                                </p>
                            </div>

                            {/* Legacy Reawakened */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>AADHRITA - A Legacy Reawakened</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    AADHRITA is the signature national-level techno-cultural fest of MVGR College of Engineering, rooted in a powerful belief - that intelligence, creativity, and courage must grow together.
                                </p>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                    More than an event, AADHRITA is a legacy shaped by generations of students, evolving with time while staying true to its founding spirit.
                                </p>
                            </div>

                            {/* Timeline Sections */}
                            <div className="space-y-8 border-l-2 border-[#D4AF37]/30 pl-6 ml-2">
                                {/* 2008 */}
                                <div>
                                    <span className="text-[#D4AF37] font-bold text-xl block mb-2">The Beginning – 2008 | Inspiring Intelligence</span>
                                    <p className="text-neutral-300 leading-loose text-lg text-justify">
                                        AADHRITA was first envisioned and launched in 2008 with the guiding philosophy “Inspiring Intelligence.” It was created as a platform that extended beyond classrooms, encouraging students to challenge conventions, explore creativity, and showcase excellence across technology, culture, and leadership. The inaugural edition marked a grand success and laid the foundation for AADHRITA as a student-driven, innovation-focused national fest.
                                    </p>
                                </div>

                                {/* 2012 */}
                                <div>
                                    <span className="text-[#D4AF37] font-bold text-xl block mb-2">Purposeful Expansion - 2012 | Innovation with Responsibility</span>
                                    <p className="text-neutral-300 leading-loose text-lg text-justify">
                                        By 2012, AADHRITA had evolved into a national-level techno-cultural fest with a deeper sense of purpose. Aligned with the United Nations theme “Sustainable Energy for All,” AADHRITA 2012 emphasized that engineering innovation must be socially responsible and globally relevant.
                                    </p>
                                    <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                        With participation from institutions across the country, the fest blended:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-neutral-300 ml-4 mt-2">
                                        <li>Technical excellence</li>
                                        <li>Cultural expression</li>
                                        <li>Sportsmanship</li>
                                        <li>Student leadership</li>
                                    </ul>
                                    <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                        This edition firmly established AADHRITA as a platform where engineering meets responsibility.
                                    </p>
                                </div>

                                {/* 2020 */}
                                <div>
                                    <span className="text-[#D4AF37] font-bold text-xl block mb-2">Creative Confluence - 2020 | Holistic Expression</span>
                                    <p className="text-neutral-300 leading-loose text-lg text-justify">
                                        After a significant pause, AADHRITA returned in 2020, reaffirming its relevance in a changing world. AADHRITA 2020 showcased a seamless confluence of technology, management, arts, and sports, reflecting the evolving aspirations of students. Advanced technical challenges, entrepreneurship events, workshops, cultural showcases, and sports competitions reinforced MVGR’s belief in holistic education.
                                    </p>
                                    <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                        This edition proved that AADHRITA is not limited by discipline, but defined by diversity and collaboration.
                                    </p>
                                </div>
                            </div>

                            {/* 2026 Vision */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>AADHRITA 2026 | A Legacy Reawakened</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    In 2026, AADHRITA returns once again - not merely as an edition, but as a legacy reawakened. Rooted in its rich history and reimagined for the present, AADHRITA 2026 is designed for a world driven by:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4 mt-4">
                                    <li>Artificial Intelligence & Data</li>
                                    <li>Innovation & Entrepreneurship</li>
                                    <li>Interdisciplinary collaboration</li>
                                    <li>Sustainability & societal impact</li>
                                    <li>Industry-ready skills</li>
                                </ul>

                                <h4 className="text-xl font-bold text-white mt-8 mb-4">What Defines AADHRITA 2026</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
                                    <li>A shift from participation to purpose-driven problem solving</li>
                                    <li>Deep integration of emerging technologies, startups, and innovation ecosystems</li>
                                    <li>Equal emphasis on technical rigor, creative expression, leadership, and culture</li>
                                    <li>A national platform where students build, innovate, perform, and lead</li>
                                </ul>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                    AADHRITA 2026 reflects the evolution of both the fest and its participants — adaptive, responsible, and future-ready.
                                </p>
                            </div>

                            {/* More Than a Fest */}
                            <div>
                                <h3 className={cn("text-2xl font-bold text-white mb-4", cinzel.className)}>More Than a Fest | A Living Legacy</h3>
                                <p className="text-neutral-300 leading-loose text-lg text-justify">
                                    AADHRITA is not an event bound by time. It is a living legacy that renews itself with every generation.
                                </p>
                                <p className="text-neutral-300 leading-loose text-lg text-justify mt-4">
                                    From 2008 to 2012, from 2020 to 2026, AADHRITA continues to stand for:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4 mt-4">
                                    <li>Challenging comfort zones</li>
                                    <li>Encouraging fearless innovation</li>
                                    <li>Celebrating creativity alongside engineering</li>
                                    <li>Preparing students for a dynamic, ever-evolving world</li>
                                </ul>
                            </div>

                            {/* Closing */}
                            <div className="text-center pt-8 border-t border-white/10 mt-12">
                                <h2 className={cn("text-4xl font-bold text-[#D4AF37] mb-2", cinzel.className)}>AADHRITA 2026</h2>
                                <p className={cn("text-xl text-neutral-400 tracking-[0.2em] mb-4 uppercase")}>A Legacy Reawakened</p>
                                <p className="text-white font-bold tracking-widest text-lg">INNOVATE. INTEGRATE. INSPIRE.</p>
                                <div className="mt-8 space-y-2 text-neutral-500 italic">
                                    <p>A legacy born in 2008.</p>
                                    <p>Strengthened in 2012.</p>
                                    <p>Reaffirmed in 2020.</p>
                                    <p className="text-white font-bold not-italic">Reawakened in 2026.</p>
                                </div>
                            </div>

                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

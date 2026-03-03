import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';

const cinzel = Cinzel({ subsets: ['latin'] });

const Footer = () => {
    return (
        // Updated Container: Rounded Top Corners, Full Width appearance but with margins
        <footer className="w-full bg-black text-white pt-12 pb-8 border-t border-white/10 relative overflow-hidden z-10 rounded-t-[3rem] mt-12 shadow-[0_-10px_40px_rgba(185,28,28,0.1)]">

            {/* Background Gradient */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-black to-black" />

            {/* Large Background Text Overlay - "AADHRITA" */}
            {/* Large Background Text Overlay - Lumina Style (Bottom Centered, Large, Subtle) */}
            <h1 className={cn("absolute -bottom-6 md:-bottom-10 left-1/2 -translate-x-1/2 text-[18vw] font-bold text-[#1a1a1a] select-none -z-10 tracking-tight leading-none opacity-100 whitespace-nowrap pointer-events-none", cinzel.className)}>
                AADHRITA
            </h1>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">

                    {/* Left Section: Logo & Branding */}
                    <div className="flex flex-col gap-6 md:max-w-sm">
                        <div className="flex items-center gap-4">
                            {/* Bigger Logo */}
                            <div className="relative w-16 h-16 contrast-125 drop-shadow-md">
                                <Image src="/assets/mvgr-logo.png" alt="MVGR Logo" fill className="object-contain" />
                            </div>
                            {/* MVGR Text in Cinzel */}
                            <div className="flex flex-col">
                                <h2 className={cn("text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400", cinzel.className)}>
                                    MVGR
                                </h2>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] font-medium">Autonomous</p>
                            </div>
                        </div>
                        <p className="text-neutral-400 text-sm mt-2 leading-relaxed max-w-xs">
                            Celebrating excellence, innovation, and culture at the heart of our campus.
                        </p>
                    </div>

                    {/* Right Section: Links (Centered vertically with logo section ideally) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 w-full md:w-auto">

                        {/* Column 1 */}
                        <div className="flex flex-col gap-4">
                            <h3 className={cn("text-[#D4AF37] font-bold text-sm uppercase tracking-wider", cinzel.className)}>Quick Links</h3>
                            <div className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
                                <Link href="/about" className="hover:text-white transition-colors">About</Link>
                                <Link href="/create-event" className="hover:text-white transition-colors">Register</Link>
                                <Link href="/dashboard" className="hover:text-white transition-colors">My Dashboard</Link>
                                <Link href="/sponsors" className="hover:text-white transition-colors">Sponsors</Link>
                                <Link href="/help" className="hover:text-white transition-colors">Help Desk</Link>
                                <Link href="/scoreboard" className="hover:text-white transition-colors">🏆 Scoreboard</Link>
                                <Link href="/faculty" className="hover:text-white transition-colors flex items-center gap-1.5">
                                    <span className="text-[9px] bg-yellow-600/20 text-yellow-500 font-bold uppercase px-1.5 py-0.5 rounded">Admin</span>
                                    Faculty Portal
                                </Link>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-4">
                            <h3 className={cn("text-[#D4AF37] font-bold text-sm uppercase tracking-wider", cinzel.className)}>Legal</h3>
                            <div className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
                                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                                <Link href="/conduct" className="hover:text-white transition-colors">Code of Conduct</Link>
                                <Link href="/help" className="hover:text-white transition-colors">Help Center</Link>
                                <Link href="/support" className="hover:text-white transition-colors">Support</Link>
                            </div>
                        </div>

                        {/* Column 3: Socials */}
                        <div className="flex flex-col gap-4">
                            <h3 className={cn("text-[#D4AF37] font-bold text-sm uppercase tracking-wider", cinzel.className)}>Socials</h3>
                            <div className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
                                <a href="https://www.instagram.com/aadhrita2026/" target="_blank" className="flex items-center gap-2 hover:text-[#E1306C] transition-colors">
                                    <Instagram className="w-4 h-4" /> Instagram
                                </a>

                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
                    <p className="text-neutral-600 text-xs tracking-wider uppercase">
                        Copyright © 2026 MVGR College of Engineering. All rights reserved.
                    </p>
                    <p className="text-neutral-600 text-xs tracking-wider uppercase">
                        Designed by <span className="text-white">Aadhrita Team</span>
                    </p>
                </div>

            </div>
        </footer>
    );
};

export default Footer;

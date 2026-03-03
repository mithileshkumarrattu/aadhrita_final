'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { doc, getDoc, collection, getCountFromServer } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/db';

// ... imports
import { CoinLoader } from '@/components/ui/CoinLoader'; // Import Loader
import { Terminal, Music, Trophy, Gamepad2, BookOpen, Microscope, ChevronRight, Coins, Menu, Calendar, MapPin, X, Sparkles, CheckCircle2, Mail } from 'lucide-react'; // Added Mail

// ... (imports)


import { EVENT_CATEGORIES } from '@/lib/constants';
import CategoriesGrid from '@/components/events/CategoriesGrid'; // Dynamic Grid
import FloatingHeader from '@/components/FloatingHeader';
import AFTSection from '@/components/landing/AFTSection';
import PosterCarousel from '@/components/landing/PosterCarousel';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/landing/CountdownTimer';
import SponsorsSection from '@/components/landing/SponsorsSection';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function LandingPage() {
  const { user, userProfile, googleLogin, logout, loading } = useAuth();
  const router = useRouter();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [hackathonTitle, setHackathonTitle] = useState<string | null>(null);
  const [hackathonDescription, setHackathonDescription] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hackathonStats, setHackathonStats] = useState<{ qualifiedTeams: number; showStatus: boolean }>({ qualifiedTeams: 0, showStatus: true });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [emailForMagicLink, setEmailForMagicLink] = useState('');
  const [showIosMagicLinkModal, setShowIosMagicLinkModal] = useState(false);
  const { sendMagicLink } = useAuth();

  useEffect(() => {
    // Detect iOS and In-App Browsers on mount
    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor) : '';
    const iosDevice = /iPad|iPhone|iPod/.test(ua) ||
      (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const inAppBrowsers = ['Instagram', 'FBAN', 'FBAV', 'WhatsApp', 'LinkedIn', 'Snapchat', 'Line'];
    const isEmbedded = inAppBrowsers.some(rule => ua.includes(rule));

    // Force Magic Link UI for both iOS and injected browsers to block Google Auth 403
    setIsIos(iosDevice || isEmbedded);
  }, []);

  useEffect(() => {
    // No auto-redirect as per user preference to see landing page
  }, [user, loading, router]);

  // Fetch Hackathon Stats (Manual Count)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch manual count from 'events/hackathon' doc
        const docRef = doc(db, COLLECTIONS.EVENTS, 'hackathon');
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setHackathonStats({
            qualifiedTeams: data.stats?.qualifiedTeams || 0,
            showStatus: data.stats?.showStatus ?? true
          });
        }
      } catch (e) { console.error("Stats Fetch Error", e); }
    };
    fetchStats();
  }, []);

  // Fetch Dynamic Content (Poster & Text)
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'cms_content', 'home_page');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPosterUrl(data.posterUrl);
          setHackathonTitle(data.hackathonTitle);
          setHackathonDescription(data.hackathonDescription);
        }
      } catch (err) {
        console.log("No custom content found, using default.");
      }
    };
    fetchContent();
  }, []);

  const handleInitialClick = async () => {
    if (loading) return;
    if (user) {
      if (userProfile?.hasEntryPass || (userProfile as any)?.isOnboarded) {
        router.push('/dashboard');
      } else {
        router.push('/register/onboarding');
      }
      return;
    }

    if (isIos) {
      setShowIosMagicLinkModal(true);
    } else {
      if (isLoggingIn) return;
      setIsLoggingIn(true);
      try {
        await googleLogin('/register/onboarding');
      } catch (error) {
        console.error("Login failed on landing", error);
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  const handleSendMagicLink = async () => {
    if (!emailForMagicLink || !emailForMagicLink.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    setIsLoggingIn(true);
    try {
      await sendMagicLink(emailForMagicLink, '/register/onboarding');
      setShowIosMagicLinkModal(false);
    } catch (error) {
      console.error("Magic link failed", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleHackathonEnroll = () => {
    router.push('/enrollment/hackathon');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <CoinLoader text="Loading Fest..." />
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-[#050505] text-white flex flex-col items-center relative overflow-x-hidden")}>

      {/* BACKGROUND IMAGES */}
      <div className="fixed inset-0 z-0">
        {/* Desktop BG: 16:9 Aspect Ratio Focus */}
        <div
          className="hidden md:block w-full h-full bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: "url('/final%20desktop.png')" }}
        />
        {/* Mobile BG: 9:16 Aspect Ratio Focus */}
        <div
          className="block md:hidden w-full h-full bg-cover bg-center bg-no-repeat opacity-70"
          style={{ backgroundImage: "url('/final.png')" }}
        />
        {/* Gradient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-black/60" />
      </div>

      {/* Navbar: The Floating Glass Island - Width Reduced */}
      <nav className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-full md:w-[95%] md:max-w-2xl animate-in slide-in-from-top duration-700">
        <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-1.5 bg-transparent md:bg-black/60 md:backdrop-blur-xl border-b border-transparent md:border-white/10 md:rounded-full md:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* 1. Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            {/* Desktop Only: Aadhrita Logo & Text */}
            <div className="hidden md:flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image src="/assets/logo-red-crown.png" alt="Logo" fill className="object-contain" />
              </div>
              <span className={cn("text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] to-[#b91c1c]", cinzel.className)}>
                AADHRITA
              </span>
            </div>

            {/* Mobile Only: MVGR Logo (Left side) */}
            <div className="flex md:hidden items-center ml-1">
              <div className="relative w-12 h-12 opacity-95">
                <Image src="/assets/mvgr-logo.png" alt="MVGR" fill className="object-contain" />
              </div>
            </div>
          </div>

          {/* 2. Links Section (Hidden on mobile) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-[#D4AF37] transition-colors">Home</a>
            <a href="/team" className="hover:text-[#D4AF37] transition-colors">Team</a>
            <a href="/about" className="hover:text-[#D4AF37] transition-colors">About</a>
            <a href="/support" className="hover:text-[#D4AF37] transition-colors">Support</a>
          </div>

          {/* 3. Right Action */}
          <div className="flex items-center gap-4">
            {/* Desktop MVGR Logo */}
            <div className="hidden md:block w-14 h-14 relative opacity-90 hover:opacity-100 transition-opacity drop-shadow-md">
              <Image
                src="/assets/mvgr-logo.png"
                alt="MVGR College"
                fill
                className="object-contain"
              />
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              className="md:hidden p-2 text-white hover:text-[#D4AF37] transition-colors mr-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-8 h-8" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8 gap-16 md:gap-24">

        {/* Hero Section - Centered Layout - Compact */}
        {/* Hero Section - Centered Layout - Compact */}
        <div className="w-full pt-20 md:pt-16 flex flex-col items-center text-center max-w-5xl mx-auto min-h-[90vh] md:min-h-0 justify-center">

          <div className="animate-in fade-in zoom-in duration-1000 space-y-0.5 md:space-y-2">

            {/* Logo */}
            <div className="relative w-20 h-20 md:w-32 md:h-32 mx-auto mb-1 md:mb-2 drop-shadow-[0_0_50px_rgba(185,28,28,0.4)]">
              <Image
                src="/assets/logo-red-crown.png"
                alt="Aadhrita Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Title */}
            <div>
              <h1 className={cn("text-6xl md:text-[8rem] font-bold uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]", cinzel.className)}>
                Aadhrita
              </h1>
              {/* Tagline Moved Here - Reduced Margin */}
              <h2 className={cn("text-xl md:text-5xl font-bold uppercase tracking-[0.2em] text-[#D4AF37] leading-tight mt-0.5 md:mt-2 drop-shadow-md", cinzel.className)}>
                A Legacy Reawakened
              </h2>
            </div>

            {/* Dates - Reduced Padding */}
            <div className="py-0 relative">
              <div className="inline-block px-6 py-1 border-y border-[#D4AF37]/30 bg-gradient-to-r from-transparent via-[#b91c1c]/10 to-transparent relative mt-2 md:mt-2">
                <span className={cn("text-[15px] md:text-2xl font-bold text-white tracking-widest uppercase whitespace-nowrap", cinzel.className)}>
                  12, 13 MARCH 2026
                </span>
              </div>
            </div>

            <div className="max-w-xl mx-auto space-y-1">
              <p className={cn("text-[10px] md:text-lg text-neutral-400 tracking-[0.2em] uppercase font-medium leading-relaxed show-on-scroll mt-1", cinzel.className)}>
                Powered by Aadhrita Coins
              </p>
            </div>

            {/* Countdown Timer - Reduced Gap */}
            <div className="pt-2 md:pt-4">
              <CountdownTimer targetDate="2026-03-12T00:00:00" />
            </div>

            {/* --- NEW ENTRY PASS SECTION --- */}
            <div className="w-full mt-6 md:mt-12 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 flex flex-col items-center">

              {/* Urgency Tag — amber/gold theme to stand out against the dark-red background */}
              <div className="mb-4 flex justify-center">
                <span className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-black/60 border border-[#D4AF37]/60 text-[#f7e8b5] text-xs md:text-sm font-bold tracking-widest uppercase backdrop-blur-sm z-20 relative shadow-[0_0_22px_rgba(212,175,55,0.35)]">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping absolute left-3"></span>
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] relative shrink-0"></span>
                  ⏳ Registrations closing March 3
                </span>
              </div>

              <div className="relative w-full max-w-3xl group flex flex-col gap-6 items-center">

                {/* Main Auth Interaction Area */}
                <div className="w-[90%] md:w-auto relative z-10">
                  <div className="w-full" onClick={handleInitialClick}>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] via-[#f7e8b5] to-[#b91c1c] blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
                    <Button
                      disabled={isLoggingIn && !isIos}
                      className="w-full md:w-auto px-8 md:px-12 py-6 md:py-8 text-lg md:text-2xl font-black bg-gradient-to-r from-[#D4AF37] via-[#FFF8DC] to-[#D4AF37] text-black border-2 border-yellow-200/50 rounded-full shadow-[0_0_40px_rgba(212,175,55,0.4)] transform hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(212,175,55,0.6)] transition-all duration-500 tracking-[0.15em] relative overflow-hidden group/btn disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000" />
                      <span className={cn("relative z-10 flex items-center gap-3", cinzel.className)}>
                        {isLoggingIn && !isIos ? <Loader2 className="w-6 h-6 animate-spin" /> : "GET ENTRY PASS"}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Desktop Image - Natural Aspect Ratio */}
                <div className="hidden md:block w-full rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(234,179,8,0.2)] border border-yellow-500/20 group-hover:border-yellow-500/50 transition-all duration-500">
                  <Image
                    src="/entrypass-desktop.png"
                    alt="Get Your Entry Pass"
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ width: '100%', height: 'auto' }}
                    className="group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                {/* Mobile Image - Natural Aspect Ratio */}
                <div className="block md:hidden w-full rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.2)] border border-yellow-500/20">
                  <Image
                    src="/entrypass-mobile.png"
                    alt="Get Your Entry Pass"
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>

              </div>
            </div>
            {/* ----------------------------- */}

          </div>
        </div>

        {/* Dynamic Admin-Managed Poster Carousel */}
        <PosterCarousel />

        {/* SECTION 1: FLAGSHIP EVENT (USER CODE) */}
        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          <div className="flex items-center gap-4 opacity-100 drop-shadow-lg">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#b91c1c] to-[#DAD0BD]" />
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold bg-green-600 text-white px-3 py-1 rounded-full mb-2 animate-pulse shadow-[0_0_15px_rgba(22,163,74,0.6)]">
                ENROLLMENT OPEN
              </span>
              <h2 className={cn("text-xl md:text-2xl font-bold uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] drop-shadow-sm", cinzel.className)}>
                Flagship Event
              </h2>
            </div>
            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#b91c1c] to-[#DAD0BD]" />
          </div>

          {/* Unified Hackathon Card */}
          <div className="w-full relative group animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Background Glows REMOVED for Matte Black look */}
            {/* <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-[3rem] opacity-30 group-hover:opacity-60 blur-xl transition-all duration-1000" /> */}

            <div className="relative w-full bg-black/40 backdrop-blur-md rounded-[3rem] border border-white/10 overflow-hidden grid lg:grid-cols-2 gap-0 shadow-lg">

              {/* Column 1: Poster & Visuals */}
              <div className="relative h-auto min-h-[400px] lg:h-auto bg-transparent overflow-hidden group/poster flex items-center justify-center p-4">
                {/* Poster Image */}
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt="Event Poster"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-neutral-900/50">
                    <span className="text-5xl mb-4 opacity-50">🔥</span>
                    <h3 className="text-xl font-bold text-neutral-400 uppercase tracking-widest">Event Poster</h3>
                    <p className="text-sm text-neutral-600 mt-2 font-mono">Loading...</p>
                  </div>
                )}
              </div>

              {/* Column 2: Content & Stats */}
              <div className="flex flex-col justify-center p-6 md:p-12 gap-8 relative">
                {/* Powered By Header */}
                <div className="flex items-center gap-3 self-start bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/10 transition-colors">
                  <span className="text-xs text-neutral-200 font-bold uppercase tracking-widest">Powered By</span>
                  <div className="h-4 w-[1px] bg-white/10" />
                </div>

                {/* Logo Replacement */}
                <div className="bg-white rounded-xl p-6 mb-6 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] max-w-md">
                  <img
                    src="/assets/Logo Dark Wide.svg"
                    alt="Aadhrita Hackathon"
                    className="w-full h-auto object-contain"
                  />
                </div>

                {/* Dynamic Description */}
                <p className="text-neutral-300 leading-relaxed text-sm md:text-base font-medium max-w-lg text-justify opacity-80">
                  {hackathonDescription || "A hackathon is a time-bound, collaborative event where people (coders, designers, etc.) rapidly develop solutions, prototypes, or ideas to solve a specific problem or challenge, often lasting 24-48 hours. Participants form teams, work intensively, and present their finished projects to judges for prizes."}
                </p>

                {/* Stats Grid - Integrated */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-start hover:bg-white/10 transition-colors">
                    <span className={cn("text-3xl font-black text-[#D4AF37] leading-none", cinzel.className)}>
                      120
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Teams Qualified</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-start hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-auto">Enrollment Screening</span>
                  </div>
                </div>

                {/* CTA Actions */}
                <div className="flex flex-col gap-3 mt-2">
                  <Button
                    onClick={handleHackathonEnroll}
                    disabled={loading}
                    className="h-14 md:h-16 text-lg md:text-xl font-bold bg-gradient-to-r from-red-700 to-orange-600 text-white hover:from-red-600 hover:to-orange-500 border border-orange-500/20 transition-all rounded-2xl shadow-[0_0_30px_rgba(234,88,12,0.3)] flex items-center justify-center gap-3 w-full group/btn relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                    {loading ? (
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <span className="relative z-10">Enroll Now</span>
                        <svg className="w-5 h-5 md:w-6 md:h-6 group-hover/btn:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </>
                    )}
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wide">
                    <span className="text-orange-500">⚡</span>
                    Includes Food & Accommodation for 24 Hours
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1.5: SPONSORS */}
        <SponsorsSection />

        {/* SECTION 2: CATEGORIES */}

        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <div className="flex items-center gap-4 opacity-100 mt-12">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#b91c1c] to-[#DAD0BD]" />
            <span className={cn("text-xl font-bold uppercase tracking-[0.3em] text-zinc-400", cinzel.className)}>
              Explore Categories
            </span>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-[#DAD0BD] via-[#b91c1c] to-transparent" />
          </div>

          <CategoriesGrid />
        </div>

        {/* SECTION 3: AFT / REWARDS (Moved to Bottom) */}
        <AFTSection />

      </main>

      {/* Footer - Full Width */}
      <Footer />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-10 duration-300">
          <button
            className="absolute top-8 right-8 p-2 text-zinc-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>

          <nav className="flex flex-col items-center gap-8 text-2xl font-bold uppercase tracking-widest">
            <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37] transition-colors">Home</a>
            <a href="/team" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37] transition-colors">Team</a>
            <a href="/about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37] transition-colors">About</a>
            <a href="/support" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37] transition-colors">Support</a>

            <div className="h-px w-24 bg-white/20 my-2" />

            {user ? (
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-mono text-neutral-400 normal-case overflow-hidden text-ellipsis max-w-[250px] opacity-70">
                  {user.email || "Logged In"}
                </span>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsMobileMenuOpen(false); handleInitialClick(); }}
                className="text-[#D4AF37] hover:text-[#f7e8b5] transition-colors"
              >
                LOGIN
              </button>
            )}
          </nav>
        </div>
      )}

      {/* iOS Magic Link Modal */}
      {showIosMagicLinkModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_50px_rgba(212,175,55,0.15)] relative flex flex-col gap-4">
            <button
              onClick={() => setShowIosMagicLinkModal(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-2 mt-2">
              <span className={cn("text-[#D4AF37] text-xl uppercase tracking-widest font-bold", cinzel.className)}>Secure Login</span>
              <p className="text-neutral-400 text-sm mt-2">Enter your email to receive a secure sign-in link.</p>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="email"
                placeholder="student@example.com"
                value={emailForMagicLink}
                onChange={(e) => setEmailForMagicLink(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-xl py-4 pl-10 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex gap-3 text-left items-start mt-1">
              <span className="text-red-500 shrink-0 text-xl leading-none">⚠️</span>
              <p className="text-xs text-red-200/80 leading-relaxed font-medium">
                <strong className="text-red-400 block mb-1">Check your Spam folder! and mark not as a spam</strong>
                The login link might be marked as promotional or junk by your email provider. Please look there if it's missing from your Inbox.
              </p>
            </div>

            <Button
              onClick={handleSendMagicLink}
              disabled={isLoggingIn || !emailForMagicLink}
              className="w-full py-6 mt-3 text-sm md:text-base font-black bg-gradient-to-r from-[#D4AF37] via-[#FFF8DC] to-[#D4AF37] text-black rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SEND MAGIC LINK"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

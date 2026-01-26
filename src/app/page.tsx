'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/db';

// ... imports
import { CoinLoader } from '@/components/ui/CoinLoader'; // Import Loader
import { Terminal, Music, Trophy, Gamepad2, BookOpen, Microscope, ChevronRight, Coins, Menu, Calendar, MapPin, X } from 'lucide-react'; // Icons
import { EVENT_CATEGORIES } from '@/lib/constants';
import CategoriesGrid from '@/components/events/CategoriesGrid'; // Dynamic Grid
import FloatingHeader from '@/components/FloatingHeader';
import AFTSection from '@/components/landing/AFTSection';
import PosterCarousel from '@/components/landing/PosterCarousel';

const cinzel = Cinzel({ subsets: ['latin'] });

export default function LandingPage() {
  const { user, userProfile, googleLogin, loading } = useAuth();
  const router = useRouter();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [hackathonTitle, setHackathonTitle] = useState<string | null>(null);
  const [hackathonDescription, setHackathonDescription] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // No auto-redirect as per user preference to see landing page
  }, [user, loading, router]);

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

  const handleLogin = async () => {
    if (!user) {
      await googleLogin('/register/onboarding');
    } else {
      router.push('/register/onboarding');
    }
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

      {/* Navbar: The Floating Glass Island */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl animate-in slide-in-from-top duration-700">
        <div className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* 1. Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="relative w-8 h-8">
              <Image src="/assets/logo-red-crown.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className={cn("text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] to-[#b91c1c]", cinzel.className)}>
              AADHRITA
            </span>
            {/* Mobile Only: MVGR Logo beside Aadhrita */}
            <div className="block md:hidden relative w-8 h-8 opacity-90 ml-2">
              <Image src="/assets/mvgr-logo.png" alt="MVGR" fill className="object-contain" />
            </div>
          </div>

          {/* 2. Links Section (Hidden on mobile) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-[#D4AF37] transition-colors">Home</a>
            <a href="/team" className="hover:text-[#D4AF37] transition-colors">Team</a>
            <a href="/about" className="hover:text-[#D4AF37] transition-colors">About</a>
          </div>

          {/* 3. Right Action */}
          <div className="flex items-center gap-4">
            {/* Desktop MVGR Logo */}
            <div className="hidden md:block w-10 h-10 relative opacity-90 hover:opacity-100 transition-opacity drop-shadow-md">
              <Image
                src="/assets/mvgr-logo.png"
                alt="MVGR College"
                fill
                className="object-contain"
              />
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              className="md:hidden p-2 text-white hover:text-[#D4AF37] transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8 gap-16 md:gap-24">

        {/* Hero Section - Split Layout */}
        <div className="w-full pt-28 md:pt-44">

          {/* DESKTOP LAYOUT (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-2 items-center gap-4 lg:gap-12 w-full">
            {/* Left: Text & Action */}
            <div className="flex flex-col items-start text-left space-y-6 animate-in slide-in-from-left duration-1000 pl-8">
              <div>
                <h1 className={cn("text-6xl lg:text-[7rem] font-bold uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]", cinzel.className)}>
                  Aadhrita
                  <span className="block text-4xl lg:text-5xl text-[#D4AF37] tracking-[0.2em] mt-2">2026</span>
                </h1>
                <p className={cn("text-xl text-zinc-400 mt-4 tracking-widest uppercase font-medium")}>
                  A Legacy Reawakened.
                </p>
              </div>

              <div className="flex items-center gap-4 py-4">
                <div className="h-px w-12 bg-[#D4AF37]" />
                <span className="text-2xl font-black text-white tracking-widest uppercase font-mono">26 - 27 FEB</span>
              </div>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    if (userProfile?.hasEntryPass) {
                      router.push('/dashboard');
                    } else if (user) {
                      handleLogin();
                    } else {
                      googleLogin();
                    }
                  }}
                  className="relative px-8 py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-bold text-lg rounded-full shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:shadow-[0_0_35px_rgba(251,191,36,0.8)] hover:scale-105 transition-all duration-300"
                >
                  {userProfile?.hasEntryPass ? "Show Pass" : "Get Your Pass"}
                </button>


              </div>
            </div>

            {/* Right: The Visual (Ticket) - 3D Floating Card - CLEAN */}
            <div className="relative w-full aspect-video perspective-1000 animate-in slide-in-from-right duration-1000 delay-200">
              <div className="
                        relative w-full h-full 
                        transform 
                        rotate-y-[-12deg] 
                        rotate-x-[5deg] 
                        hover:rotate-y-[0deg] 
                        hover:rotate-x-[0deg]
                        transition-all 
                        duration-500 
                        ease-out 
                        animate-float
                    ">

                <Image
                  src="/Black and Orange Retro Live Music Ticket.png"
                  alt="Aadhrita Entry Pass"
                  fill
                  className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* MOBILE LAYOUT (Hidden on Desktop) */}
          <div className="flex md:hidden flex-col items-center gap-8 text-center">
            {/* Header Text */}
            <div className="space-y-2 animate-in fade-in zoom-in duration-700">
              <h1 className={cn("text-6xl font-black uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c]", cinzel.className)}>
                Aadhrita <span className="text-[#D4AF37] text-4xl">2026</span>
              </h1>
              <p className="text-sm font-bold tracking-[0.3em] text-white/80">
                POWERED BY AADHRITA COINS
              </p>
            </div>

            {/* The Mobile Hero: Digital Wallet Pass */}
            <div className="relative w-[300px] h-[450px] my-4 animate-in slide-in-from-bottom duration-700 delay-100">
              {/* Glow behind */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[350px] bg-red-600/20 blur-[80px] rounded-full" />

              <div className="relative w-full h-full transform transition-transform hover:scale-105 duration-500">
                <Image
                  src="/entrypass-mobile.png"
                  alt="Entry Pass Mobile"
                  fill
                  className="object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
                  priority
                />

                {/* Interactive overlay hint */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>

            {/* CTA Button Matching Aesthetics */}
            <div className="w-full px-8 animate-in slide-in-from-bottom duration-700 delay-300">
              <Button
                onClick={() => {
                  if (userProfile?.hasEntryPass) {
                    router.push('/dashboard');
                  } else if (user) {
                    handleLogin();
                  } else {
                    googleLogin();
                  }
                }}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-400 to-[#D4AF37] text-black font-black text-xl uppercase tracking-widest shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:shadow-[0_0_60px_rgba(212,175,55,0.5)] transition-all transform hover:-translate-y-1"
              >
                {userProfile?.hasEntryPass ? "Show Pass" : "Get Pass"}
              </Button>
            </div>
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

          <div className="w-full grid md:grid-cols-2 gap-8 items-center bg-black/40 backdrop-blur-xl rounded-[3rem] p-6 border border-white/10 shadow-[0_0_50px_rgba(220,38,38,0.1)] overflow-hidden group hover:shadow-[0_0_70px_rgba(220,38,38,0.2)] hover:border-red-500/30 transition-all duration-500">
            {/* ... Flagship Content ... */}
            <div className="relative w-full h-[400px] md:h-[500px] bg-black rounded-[2.5rem] overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,1)] flex items-center justify-center border-none">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt="Event Poster"
                  fill
                  className="object-contain p-2 hover:scale-105 transition-transform duration-700 mix-blend-screen"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-neutral-900/50">
                  <span className="text-5xl mb-4 opacity-50">🔥</span>
                  <h3 className="text-xl font-bold text-neutral-400 uppercase tracking-widest">Event Poster</h3>
                  <p className="text-sm text-neutral-600 mt-2 font-mono">Loading...</p>
                </div>
              )}
              {/* Vignette Overlay */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_#000000]" />
            </div>

            {/* Event Details & CTA */}
            <div className="p-4 md:p-12 flex flex-col gap-8 text-left justify-center h-full">
              <div>
                {/* Dynamic Title */}
                <h2
                  className={cn("text-4xl md:text-6xl font-black leading-[0.95] mb-6 drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c]", cinzel.className)}
                  dangerouslySetInnerHTML={{
                    __html: hackathonTitle || 'AADHRITA HACK24'
                  }}
                />

                {/* Dynamic Description */}
                <p className="text-neutral-300 leading-relaxed text-sm md:text-base font-medium max-w-lg text-justify">
                  {hackathonDescription || "A hackathon is a time-bound, collaborative event where people (coders, designers, etc.) rapidly develop solutions, prototypes, or ideas to solve a specific problem or challenge, often lasting 24-48 hours. Participants form teams, work intensively, and present their finished projects to judges for prizes, aiming to foster innovation, skill development"}
                </p>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="h-16 text-xl font-bold bg-gradient-to-r from-red-700 to-orange-600 text-white hover:from-red-600 hover:to-orange-500 border border-orange-500/20 transition-all rounded-2xl shadow-[0_0_30px_rgba(234,88,12,0.3)] flex items-center justify-center gap-3 w-full group/btn relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                  {loading ? (
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <span className="relative z-10">Enroll Now</span>
                      <svg className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-neutral-500 font-bold uppercase tracking-wide">
                  Includes Food for 24 Hours
                </p>
              </div>
            </div>
          </div>
        </div>

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

        {/* Footer */}
        <footer className="w-full border-t border-white/10 mt-12 py-8 flex flex-col items-center gap-4 text-center z-10 bg-black/80 backdrop-blur-md">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="relative w-8 h-8">
              <Image src="/assets/logo-red-crown.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className={cn("text-xl font-bold text-zinc-500", cinzel.className)}>
              AADHRITA 2026
            </span>
          </div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            MVGR College of Engineering (Autonomous)
          </p>
        </footer>

      </main>

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

          </nav>
        </div>
      )}
    </div>
  );
}

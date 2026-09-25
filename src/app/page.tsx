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

import { CoinLoader } from '@/components/ui/CoinLoader'; 
import { Terminal, Music, Trophy, Gamepad2, BookOpen, Microscope, ChevronRight, Coins, Menu, Calendar, MapPin, X, Sparkles, CheckCircle2, Mail } from 'lucide-react'; 

import { EVENT_CATEGORIES } from '@/lib/constants';
import CategoriesGrid from '@/components/events/CategoriesGrid'; 
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

  return (
    <div className={cn("min-h-screen bg-[#050505] text-white flex flex-col items-center relative overflow-x-hidden")}>

      {/* BACKGROUND IMAGES */}
      <div className="fixed inset-0 z-0">
        <div
          className="hidden md:block w-full h-full bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: "url('/final%20desktop.png')" }}
        />
        <div
          className="block md:hidden w-full h-full bg-cover bg-center bg-no-repeat opacity-70"
          style={{ backgroundImage: "url('/final.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-black/60" />
      </div>

      {/* Navbar: Fully Restored */}
      <nav className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-full md:w-[95%] md:max-w-xl animate-in slide-in-from-top duration-700">
        <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image src="/assets/logo-red-crown.png" alt="Logo" fill className="object-contain" />
              </div>
              <span className={cn("text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#DAD0BD] to-[#b91c1c]", cinzel.className)}>
                AADHRITA
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-[#D4AF37] transition-colors">Home</a>
            <a href="/team" className="hover:text-[#D4AF37] transition-colors">Team</a>
            <a href="/about" className="hover:text-[#D4AF37] transition-colors">About</a>
            <a href="/support" className="hover:text-[#D4AF37] transition-colors">Support</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block w-10 h-10 relative opacity-90 drop-shadow-md">
              <Image src="/assets/mvgr-logo.png" alt="MVGR College" fill className="object-contain" />
            </div>
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
        
        {/* Hero Section */}
        <div className="w-full pt-20 md:pt-32 flex flex-col items-center text-center max-w-5xl mx-auto min-h-[85vh] justify-center">
          <div className="animate-in fade-in zoom-in duration-1000 space-y-4 md:space-y-6">
            {/* Logo */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-2 drop-shadow-[0_0_50px_rgba(185,28,28,0.4)]">
              <Image src="/assets/logo-red-crown.png" alt="Aadhrita Logo" fill className="object-contain" priority />
            </div>

            {/* Title */}
            <div>
              <h1 className={cn("text-6xl md:text-[8rem] font-bold uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#DAD0BD] via-[#f7e8b5] to-[#b91c1c] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]", cinzel.className)}>
                Aadhrita
              </h1>
              <h2 className={cn("text-xl md:text-5xl font-bold uppercase tracking-[0.2em] text-[#D4AF37] leading-tight mt-2 drop-shadow-md", cinzel.className)}>
                2026
              </h2>
            </div>

            {/* Redesigned Success Note - Black Transparent Card */}
            <div className="max-w-3xl mx-auto pt-10">
              <div className="relative group">
                {/* Subtle Amber Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 blur-2xl opacity-50 rounded-3xl" />
                
                <div className="relative px-8 md:px-12 py-12 md:py-16 bg-black/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                  {/* Glass Highlight */}
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  
                  <span className={cn("text-2xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#f7e8b5] to-[#D4AF37] tracking-widest uppercase leading-[1.3] drop-shadow-lg block antialiased", cinzel.className)}>
                    AADHRITA 2026 HAS BEEN A GRAND SUCCESS WITH ALL YOUR SUPPORT
                  </span>
                  
                  <div className="mt-10 flex items-center justify-center gap-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D4AF37]/30" />
                    <Sparkles className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D4AF37]/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMMENTED OUT SECTIONS FOR POST-FEST STATE */}
        {/* 
        <PosterCarousel />
        
        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
           ... Flagship Event Logic ...
        </div>

        <SponsorsSection />

        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          ... Categories Grid ...
        </div>

        <AFTSection />
        */}

      </main>

      <Footer />

      {/* Mobile Menu Overlay: Restored */}
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
          </nav>
        </div>
      )}

      {/* Magic Link Modal: Restored for backend logic consistency (though hidden visually from UI links) */}
      {showIosMagicLinkModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_50px_rgba(212,175,55,0.15)] relative flex flex-col gap-4">
            <button onClick={() => setShowIosMagicLinkModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"><X className="w-6 h-6" /></button>
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
            <Button
              onClick={handleSendMagicLink}
              disabled={isLoggingIn || !emailForMagicLink}
              className="w-full py-6 mt-3 text-sm md:text-base font-black bg-gradient-to-r from-[#D4AF37] via-[#FFF8DC] to-[#D4AF37] text-black rounded-xl"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SEND MAGIC LINK"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

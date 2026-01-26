'use client';

import * as React from 'react';
import QRCode from 'react-qr-code';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';

function LiveClock() {
    const [time, setTime] = React.useState('');

    React.useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return <>{time}</>;
}

interface EntryPassCardProps {
    userProfile: any;
    events?: any[];
    className?: string;
}

export function EntryPassCard({ userProfile, events = [], className }: EntryPassCardProps) {
    const [isFlipped, setIsFlipped] = React.useState(false);

    // Generate the QR Value - secure simply with UID for now.
    const qrValue = JSON.stringify({
        uid: userProfile?.uid,
        name: userProfile?.fullName,
        role: userProfile?.role,
        valid: userProfile?.hasEntryPass // Only valid if paid
    });

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const hasPaid = userProfile?.hasEntryPass === true;

    if (!hasPaid) {
        // Fallback or Unpaid View (Simple Greeting & Prompt)
        return (
            <Card className={cn("relative overflow-hidden border-2 border-dashed border-zinc-800 rounded-[2rem] bg-zinc-900/50 p-6 text-center", className)}>
                <h1 className="text-lg font-bold text-zinc-400">Welcome, {userProfile?.fullName?.split(' ')[0]}</h1>
                <p className="text-sm text-zinc-500 mt-2">Get your Entry Pass to access the kingdom.</p>
            </Card>
        )
    }

    return (
        <div className={cn("w-full space-y-6", className)}>

            {/* --- Greeting Section (Restored) --- */}
            <div className="flex justify-between items-center px-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight leading-none text-zinc-400 mb-0.5">
                        Welcome,
                    </h1>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                        {userProfile?.fullName?.split(' ')[0] || 'Student'}
                    </div>
                </div>

                {/* Live Profile Photo for Security Check */}
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative group cursor-pointer">
                            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 animate-gradient-xy">
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-zinc-800 relative">
                                    {userProfile?.photoUrl ? (
                                        <img
                                            src={userProfile.photoUrl}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900">
                                            {userProfile?.fullName?.[0] || '?'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-black uppercase tracking-wider">
                                Live
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="bg-black/95 border-yellow-500/30 text-white w-[90vw] max-w-sm rounded-[2rem] p-0 overflow-hidden">
                        <DialogTitle className="sr-only">Security Verification</DialogTitle>
                        <div className="relative flex flex-col items-center justify-center py-12 px-6">

                            {/* Holographic Border Effect */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-scanline" />
                                <div className="absolute inset-0 border-[6px] border-transparent rounded-[2rem]"
                                    style={{
                                        background: 'linear-gradient(45deg, #FFD700, #FF0000, #FFD700) border-box',
                                        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                        WebkitMaskComposite: 'xor',
                                        maskComposite: 'exclude'
                                    }} />
                            </div>

                            {/* Live Clock */}
                            <div className="absolute top-6 font-mono text-xl font-bold text-yellow-500 tracking-widest tabular-nums animate-pulse">
                                <LiveClock />
                            </div>

                            {/* Large Photo */}
                            <div className="relative w-48 h-48 rounded-full border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)] overflow-hidden mb-6 z-10">
                                {userProfile?.photoUrl ? (
                                    <img
                                        src={userProfile.photoUrl}
                                        alt="Profile Large"
                                        className="w-full h-full object-cover scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-4xl font-bold text-zinc-600">
                                        No IMG
                                    </div>
                                )}
                                {/* Moving Glitch Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 to-transparent mix-blend-overlay animate-spin-slow" />
                            </div>

                            <div className="text-center space-y-2 z-10">
                                <h3 className="text-2xl font-black uppercase text-white tracking-widest leading-none">
                                    {userProfile?.fullName}
                                </h3>
                                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-1.5 rounded-full border border-green-500/30">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Identity Verified</span>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* --- Flip Card Container --- */}
            <div className="w-full perspective-1000">
                <div
                    className={cn(
                        "relative w-full transition-all duration-700 transform-style-3d cursor-pointer",
                        isFlipped ? "h-[620px] rotate-y-180" : "h-[500px]"
                    )}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* --- FRONT: GOLDEN TICKET --- */}
                    <div className="absolute inset-0 backface-hidden w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border-2 border-yellow-600/30 bg-black">
                        <img
                            src="/entrypass-mobile.png"
                            alt="Golden Ticket"
                            className="w-full h-full object-contain bg-black"
                        />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center animate-bounce">
                            <span className="bg-black/70 backdrop-blur-md text-yellow-500 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-yellow-500/50">
                                Tap to Flip
                            </span>
                        </div>
                    </div>

                    {/* --- BACK: QR CODE & EVENTS --- */}
                    <div className="absolute inset-0 backface-hidden w-full h-full rounded-[2rem] overflow-hidden shadow-2xl bg-black border-[3px] border-yellow-500 rotate-y-180 flex flex-col p-5 relative">

                        {/* Background Textures */}
                        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none">
                            <img src="/s2.webp" alt="Texture" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black/80 z-0 pointer-events-none" />

                        {/* Golden Corners */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-yellow-500 rounded-tl-xl z-10 opacity-50" />
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-yellow-500 rounded-tr-xl z-10 opacity-50" />
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-yellow-500 rounded-bl-xl z-10 opacity-50" />
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-yellow-500 rounded-br-xl z-10 opacity-50" />

                        {/* Top: QR Code (Moved Up, Compressed Header removed) */}
                        <div className="relative z-20 flex flex-col items-center shrink-0 mb-4 mt-2">
                            <div className="p-2 bg-white rounded-xl border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] mb-3">
                                <QRCode
                                    value={qrValue}
                                    size={130}
                                    viewBox={`0 0 256 256`}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    fgColor="#000000"
                                    bgColor="#FFFFFF"
                                />
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/40 rounded-full backdrop-blur-sm">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Verified Identity</span>
                            </div>
                        </div>

                        {/* Bottom: Registered Events List (Utilizing Space) */}
                        <div className="relative z-20 flex-1 overflow-hidden flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-2">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 text-center border-b border-zinc-800 pb-1">Registered Events</h3>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                                {events.length > 0 ? (
                                    events.map((event, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-zinc-800 hover:border-yellow-500/30 transition-colors shrink-0">
                                            <div className="text-xs font-bold text-zinc-300 truncate max-w-[70%]">{event.title}</div>
                                            <div className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-wider">Pass</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-xs text-zinc-600 italic">No events found</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="text-center mt-6">
                    <Button
                        variant="outline"
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="bg-zinc-900 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all font-bold tracking-wider"
                    >
                        {isFlipped ? "Show Entry pass" : "View QR Code"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

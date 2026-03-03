'use client';

import * as React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/db';
import { Trophy, Users, RefreshCw, TrendingUp } from 'lucide-react';
import { Cinzel } from 'next/font/google';
import { cn } from '@/lib/utils';

const cinzel = Cinzel({ subsets: ['latin'] });

// ── Department config ─────────────────────────────────────────────────────────
const DEPT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    CSE: { label: 'CSE', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)' },
    DATA_ENG: { label: 'DATA ENG.', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
    ECE: { label: 'ECE', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)' },
    MECH: { label: 'MECH', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
    CIVIL: { label: 'CIVIL', color: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)' },
    EEE: { label: 'EEE', color: '#fb7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.35)' },
    IT: { label: 'IT', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)', border: 'rgba(45,212,191,0.35)' },
    MBA: { label: 'MBA', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.35)' },
    OTHER: { label: 'Other', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.35)' },
};

// Normalise a branch/department string → canonical key from DEPT_CONFIG
function normDept(raw: string | undefined): string {
    if (!raw) return 'OTHER';
    const s = raw.toUpperCase().trim();
    if (
        s.includes('CSD') || s.includes('DATA SCIE') || s.includes('DATA ENG') || s === 'DE' ||
        s.includes('CSM') || s.includes('MACHINE') || s.includes('ML') || s.includes('ARTIFICIAL') ||
        s.includes('CIC') || s.includes('IOT') || s.includes('CYBER') || s.includes('CC') ||
        s.includes('CSAM') || (s.includes('AI') && s.includes('M'))
    ) {
        return 'DATA_ENG';
    }
    if (s.startsWith('CS') || s === 'COMPUTER SCIENCE' || s.includes('COMPUTER SCIENCE AND ENGINEERING')) return 'CSE';
    if (s.startsWith('ECE') || s.includes('ELECTRONICS')) return 'ECE';
    if (s.startsWith('EEE') || s.includes('ELECTRICAL')) return 'EEE';
    if (s.includes('MECH')) return 'MECH';
    if (s.includes('CIVIL') || s.includes('CVIL')) return 'CIVIL';
    if (s === 'IT' || s.includes('INFORM') || s.includes('IECT') || s.includes('IE&CT') || s.includes('IE & CT') || s.includes('CIT')) return 'IT';
    if (s.includes('MBA') || s.includes('BUSINESS')) return 'MBA';
    if (s.includes('CHE')) return 'OTHER'; // Scoreboard doesn't have CHEMICAL yet, it goes to OTHER
    return 'OTHER';
}

function isMvgrCollege(d: any): boolean {
    const c = String(d.collegeName || '').toUpperCase();
    if (c.includes('MVGR') || c.includes('MAHARAJ') || c.includes('VIJAYARAM') || c.includes('GAJAPATHI')) return true;
    if (d.email && String(d.email).toLowerCase().endsWith('@mvgrce.edu.in')) return true;
    if (!d.collegeName) return true; // assuming default if missing
    return false;
}

const MEDALS = ['🥇', '🥈', '🥉'];

interface DeptStat { key: string; label: string; count: number; color: string; bg: string; border: string }

export default function ScoreboardPage() {
    const [stats, setStats] = React.useState<DeptStat[]>([]);
    const [total, setTotal] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [lastUpdated, setLastUpdated] = React.useState('');
    const [refreshKey, setRefreshKey] = React.useState(0);

    // Auto-refresh every 60 s
    React.useEffect(() => {
        const id = setInterval(() => setRefreshKey(k => k + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    React.useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/stats/scoreboard');
                const data = await res.json();

                if (data.success && data.counts) {
                    const sorted: DeptStat[] = Object.entries(data.counts as Record<string, number>)
                        .map(([key, count]) => ({
                            key,
                            count,
                            label: DEPT_CONFIG[key]?.label || key,
                            color: DEPT_CONFIG[key]?.color || '#9ca3af',
                            bg: DEPT_CONFIG[key]?.bg || 'rgba(156,163,175,0.12)',
                            border: DEPT_CONFIG[key]?.border || 'rgba(156,163,175,0.35)',
                        }))
                        .sort((a, b) => b.count - a.count);

                    const grandTotal = sorted.reduce((acc, s) => acc + s.count, 0);
                    setStats(sorted);
                    setTotal(grandTotal);
                    setLastUpdated(new Date().toLocaleTimeString());
                }
            } catch (e) {
                console.error('[Scoreboard] Failed to load:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshKey]);

    const maxCount = stats[0]?.count || 1;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-full px-4 py-1.5 mb-4">
                        <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.25em]">Live Registrations</span>
                    </div>
                    <h1 className={cn('text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e1c] uppercase tracking-tight mb-2', cinzel.className)}>
                        Scoreboard
                    </h1>
                    <p className="text-neutral-500 text-sm">Department-wise registrations · Aadhrita 2026</p>

                    {/* Live stats banner */}
                    <div className="mt-6 flex flex-wrap justify-center gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
                            <Users className="w-5 h-5 text-[#D4AF37]" />
                            <div className="text-left">
                                <p className="text-2xl font-black text-white leading-none">{loading ? '—' : total}</p>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Total Registered</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-[#D4AF37]" />
                            <div className="text-left">
                                <p className="text-2xl font-black text-white leading-none">{loading ? '—' : stats.length}</p>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Departments</p>
                            </div>
                        </div>
                        {lastUpdated && (
                            <button
                                onClick={() => setRefreshKey(k => k + 1)}
                                className="bg-white/5 border border-white/10 hover:border-white/25 rounded-2xl px-4 py-3 flex items-center gap-2 transition-colors group"
                            >
                                <RefreshCw className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                                <span className="text-[10px] text-neutral-500 group-hover:text-white transition-colors">
                                    Updated {lastUpdated}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="w-10 h-10 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
                    </div>
                ) : stats.length === 0 ? (
                    <p className="text-center text-neutral-600 py-24">No registration data yet.</p>
                ) : (
                    <>
                        {/* ── Bar Chart ─────────────────────────────────────── */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-6 mb-6">
                            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] mb-6">Registration Chart</h2>
                            <div className="flex flex-col gap-3">
                                {stats.map((dept, idx) => {
                                    const pct = Math.max(4, (dept.count / maxCount) * 100);
                                    return (
                                        <div key={dept.key} className="flex items-center gap-3">
                                            <div className="w-6 text-xs text-neutral-600 font-bold shrink-0 text-right">
                                                {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
                                            </div>
                                            <div className="w-12 text-xs font-bold shrink-0" style={{ color: dept.color }}>
                                                {dept.label}
                                            </div>
                                            <div className="flex-1 h-8 bg-white/[0.04] rounded-lg overflow-hidden relative">
                                                <div
                                                    className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: `linear-gradient(90deg, ${dept.bg}, ${dept.border})`,
                                                        borderRight: `2px solid ${dept.color}`,
                                                    }}
                                                />
                                            </div>
                                            <div className="w-12 text-sm font-black text-right shrink-0" style={{ color: dept.color }}>
                                                {dept.count}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Leaderboard Table ─────────────────────────────── */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-3xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/8">
                                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Department Leaderboard</h2>
                            </div>
                            <div className="divide-y divide-white/5">
                                {stats.map((dept, idx) => (
                                    <div
                                        key={dept.key}
                                        className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={cn(
                                                'text-base w-6 text-center shrink-0',
                                                idx === 0 && 'text-xl',
                                            )}>
                                                {idx < 3 ? MEDALS[idx] : (
                                                    <span className="text-neutral-600 text-sm font-bold">#{idx + 1}</span>
                                                )}
                                            </span>
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ background: dept.color, boxShadow: `0 0 8px ${dept.color}80` }}
                                            />
                                            <span className="font-bold text-white text-sm">{dept.label}</span>
                                            {idx === 0 && (
                                                <span className="text-[9px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/20 uppercase tracking-wider">
                                                    Leading
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-black text-lg text-white leading-none">{dept.count}</p>
                                                <p className="text-[10px] text-neutral-600">
                                                    {total > 0 ? ((dept.count / total) * 100).toFixed(1) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-4 border-t border-white/8 bg-white/[0.02] flex justify-between items-center">
                                <span className="text-xs text-neutral-600 uppercase tracking-wider">Grand Total</span>
                                <span className="font-black text-xl text-[#D4AF37]">{total}</span>
                            </div>
                        </div>

                        <p className="text-center text-[10px] text-neutral-700 mt-6 uppercase tracking-wider">
                            Auto-refreshes every 60 seconds · Last updated {lastUpdated}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

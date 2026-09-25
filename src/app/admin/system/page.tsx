'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    AlertTriangle, 
    RefreshCw, 
    Trash2, 
    UserMinus, 
    History, 
    CheckCircle2,
    Settings2,
    Search,
    ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { CoinLoader } from '@/components/ui/CoinLoader';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSystemMaintenancePage() {
    const [loading, setLoading] = React.useState(false);
    const [target, setTarget] = React.useState<'all' | 'specific'>('all');
    const [userId, setUserId] = React.useState('');
    const [resetType, setResetType] = React.useState<string>('welcome_kit');
    const [stats, setStats] = React.useState<any>(null);

    const handleReset = async () => {
        if (target === 'specific' && !userId) {
            toast.error("Please provide a User ID or Email");
            return;
        }

        const confirmData = target === 'all' 
            ? "ALL users/registrations" 
            : `User: ${userId}`;
            
        if (!confirm(`CRITICAL: Are you sure you want to reset ${resetType} for ${confirmData}? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        setStats(null);
        try {
            const res = await fetch('/api/admin/reset-fest-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target, userId, resetType })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Reset successful");
                setStats(data.stats);
            } else {
                toast.error(data.error || "Reset failed");
            }
        } catch (error: any) {
            console.error(error);
            toast.error("An error occurred during reset");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 border-2 border-black rounded-2xl shadow-neo">
                        <Settings2 className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Fest Management</h1>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Reset User Status & Attendance Flags</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <Card className="md:col-span-2 border-2 border-black shadow-neo rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="border-b-2 border-black bg-zinc-50 p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <RefreshCw className="w-6 h-6 text-black" />
                            <CardTitle className="text-2xl font-black uppercase">Reset Tool</CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 font-bold">Resets specific flags to 'False' or 'Unpaid' for the next phase of the fest.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {/* Target Selection */}
                        <div className="space-y-4">
                            <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Step 1: Select Target Scope</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setTarget('all')}
                                    className={cn(
                                        "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                                        target === 'all' 
                                            ? "bg-black text-white border-black shadow-neo-lg -translate-y-1" 
                                            : "bg-white text-black border-zinc-200 hover:border-black shadow-sm"
                                    )}
                                >
                                    <RefreshCw className={cn("w-8 h-8", target === 'all' ? "animate-spin-slow" : "")} />
                                    <div>
                                        <div className="font-black uppercase text-sm">Reset All</div>
                                        <div className="text-[10px] font-bold opacity-60">Apply to everyone</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setTarget('specific')}
                                    className={cn(
                                        "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                                        target === 'specific' 
                                            ? "bg-black text-white border-black shadow-neo-lg -translate-y-1" 
                                            : "bg-white text-black border-zinc-200 hover:border-black shadow-sm"
                                    )}
                                >
                                    <Search className="w-8 h-8" />
                                    <div>
                                        <div className="font-black uppercase text-sm">Specific User</div>
                                        <div className="text-[10px] font-bold opacity-60">Target single ID</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {target === 'specific' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                <Label className="text-xs font-black uppercase text-slate-500 ml-1">Identity ID / Email</Label>
                                <Input
                                    placeholder="Enter User UID or Email..."
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="h-14 border-2 border-black rounded-xl font-bold text-lg px-6 shadow-inner focus-visible:ring-black"
                                />
                            </div>
                        )}

                        {/* Reset Type */}
                        <div className="space-y-4 pt-4 border-t-2 border-dashed border-zinc-100">
                            <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Step 2: Reset Action Category</Label>
                            <Select value={resetType} onValueChange={setResetType}>
                                <SelectTrigger className="h-14 border-2 border-black rounded-xl font-black text-lg px-6 bg-zinc-50 focus:ring-black">
                                    <SelectValue placeholder="Select Reset Type" />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-black rounded-xl p-2">
                                    <SelectItem value="welcome_kit" className="font-bold py-3 rounded-lg">Reset Welcome Kit Flags</SelectItem>
                                    <SelectItem value="attendance" className="font-bold py-3 rounded-lg">Reset Attendance & Rewards</SelectItem>
                                    <SelectItem value="both" className="font-bold py-3 rounded-lg">Reset Both (Kits + Attendance)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Summary Warning */}
                        <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-[2rem] flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-black text-amber-900 uppercase text-sm">Action Warning</h4>
                                <p className="text-sm text-amber-700 font-medium leading-relaxed">
                                    This will set flags to `FALSE` for the targets selected. Attendance resets will also mark rewards as `UNPAID` in the respective event collections.
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleReset}
                            disabled={loading}
                            className="w-full h-16 bg-black hover:bg-zinc-800 text-white rounded-[1.5rem] border-b-4 border-zinc-900 shadow-neo font-black text-xl uppercase tracking-widest transition-all active:translate-y-1 active:border-b-0"
                        >
                            {loading ? <CoinLoader size={24} text="Processing..." /> : "Execute Status Reset"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Status Column */}
                <div className="space-y-6">
                    <Card className="border-2 border-black shadow-neo rounded-[2rem] bg-zinc-900 text-white p-6">
                        <h3 className="font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <History className="w-5 h-5" /> Operation Result
                        </h3>
                        {stats ? (
                            <div className="space-y-4 animate-in zoom-in-95 duration-500">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="text-3xl font-black text-amber-500">{stats.usersReset}</div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Users Reset</div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="text-3xl font-black text-blue-400">{stats.registrationsReset}</div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Registrations Cleared</div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="text-3xl font-black text-red-400">{stats.transactionsDeleted}</div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Transactions Deleted</div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-zinc-600">
                                <Trash2 className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">No Active Task</p>
                            </div>
                        )}
                    </Card>

                    <Card className="border-2 border-black shadow-neo rounded-[2rem] bg-amber-500 p-6">
                        <h3 className="font-black uppercase tracking-tight mb-2 flex items-center gap-2 text-black">
                            <CheckCircle2 className="w-5 h-5" /> Quick Tip
                        </h3>
                        <p className="text-[11px] font-bold text-amber-900 leading-tight">
                            Use this tool to clear statuses between event days or to fix a specific student who was mistakenly marked as present / received.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

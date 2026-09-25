'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Users, Calendar, Bell, FileText, LayoutDashboard, LogOut, BookOpen, Wallet, Menu as MenuIcon, X, Trophy, Ticket, ClipboardList, Image as ImageIcon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AUTHORIZED_ADMIN_EMAILS } from '@/lib/constants';

import { CoinLoader } from '@/components/ui/CoinLoader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userProfile, loading, profileLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    // AUTHORIZED_ADMIN_EMAILS moved to constants.ts

    if (loading || profileLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><CoinLoader /></div>;
    }

    if (!userProfile) {
        router.push('/login');
        return null;
    }

    const isAuthorizedEmail = AUTHORIZED_ADMIN_EMAILS.includes((userProfile.email || '').toLowerCase());
    if (userProfile.role !== 'admin' && !isAuthorizedEmail) {
        router.push('/dashboard');
        return null;
    }

    const navItems = [
        { label: 'Overview', path: '/admin', icon: LayoutDashboard },
        { label: 'Staff Management', path: '/admin/staff', icon: Shield },
        { label: 'Users & Classes', path: '/admin/users', icon: Users },
        { label: 'Wallets', path: '/admin/wallets', icon: Wallet },
        { label: 'Entry Passes', path: '/admin/entrypass', icon: Ticket },
        { icon: Trophy, label: 'Hackathon', path: '/admin/hackathon' },
        { icon: Ticket, label: 'Manage Events', path: '/admin/events' },
        { icon: ClipboardList, label: 'All Registrations', path: '/admin/registrations' },
        { icon: ImageIcon, label: 'Carousel Posters', path: '/admin/posters' },
        { icon: FileText, label: 'Home Content', path: '/admin/content' },
        { icon: ClipboardList, label: 'Categories', path: '/admin/categories' },
        { icon: Users, label: 'Faces of Aadhrita', path: '/admin/team' },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black text-white px-4 flex items-center justify-between z-40">
                <span className="font-black text-xl tracking-tighter">MVGR Admin</span>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <MenuIcon className="w-6 h-6 text-white" />
                </Button>
            </div>

            {/* Sidebar */}
            <aside className={cn(
                "w-64 bg-black text-white p-6 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:translate-x-0 md:flex",
                sidebarOpen ? "translate-x-0 flex" : "-translate-x-full hidden"
            )}>
                <div className="flex justify-between items-start mb-8 pl-2">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter">MVGR Admin</h1>
                        <p className="text-xs text-slate-400 font-medium">Control Center</p>
                    </div>
                    {/* Mobile Close */}
                    <Button variant="ghost" size="icon" className="md:hidden -mt-2 -mr-2" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5 text-zinc-400" />
                    </Button>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    router.push(item.path);
                                    setSidebarOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                    isActive
                                        ? "bg-white text-black translate-x-2"
                                        : "text-slate-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 3 : 2} />
                                {item.label}
                            </button>
                        )
                    })}
                </nav>

                <Button
                    variant="destructive"
                    className="w-full mt-auto flex items-center gap-2 font-bold"
                    onClick={logout}
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </Button>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 mt-16 md:mt-0">
                {children}
            </main>
        </div>
    );
}

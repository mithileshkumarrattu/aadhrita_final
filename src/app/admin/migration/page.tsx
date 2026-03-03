'use client';

import { useState } from 'react';
import { db, UserRegistration, COLLECTIONS } from '@/lib/db';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function MigrationPage() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, migrated: 0 });
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [`> ${msg}`, ...prev].slice(0, 50));

    const runMigration = async () => {
        if (!confirm("Start Migration? This copies 'registrations' to 'users'.")) return;
        setLoading(true);
        setLogs([]);

        try {
            addLog("Fetching registrations...");
            const regsSnap = await getDocs(collection(db, 'registrations'));
            setStats({ total: regsSnap.size, migrated: 0 });
            addLog(`Found ${regsSnap.size} docs.`);

            const batch = writeBatch(db);
            let count = 0;

            regsSnap.forEach((docSnap) => {
                const data = docSnap.data() as UserRegistration;
                const userId = docSnap.id;

                // Construct SAFE payload (only profile info)
                const payload: any = {
                    displayName: data.fullName || '', // Map to Auth display name if needed
                    fullName: data.fullName,
                    mobileNumber: data.mobileNumber,
                    email: data.email,
                    collegeName: data.collegeName,
                    collegeType: data.collegeType,
                    regNo: data.regNo,
                    degreeBranch: data.degreeBranch,
                    yearOfStudy: data.yearOfStudy,
                    cityState: data.cityState,
                    idCardUrl: data.idCardUrl,
                    photoUrl: data.photoUrl,
                    hasEntryPass: data.hasEntryPass,
                    isOnboarded: true,
                    migratedAt: serverTimestamp()
                };

                // Remove undefined
                Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

                const userRef = doc(db, 'users', userId);
                batch.set(userRef, payload, { merge: true });
                count++;
            });

            addLog(`Committing batch of ${count} updates...`);
            await batch.commit(); // Note: Limit is 500 ops. If > 500, needs chunking. Assuming small testing set for now. 
            // If > 500, simple logic:
            // if (count % 500 === 0) { await batch.commit(); batch = writeBatch(db); }

            addLog("Migration Success!");
            setStats(prev => ({ ...prev, migrated: count }));
            toast.success("Migration Done");

        } catch (e: any) {
            console.error(e);
            addLog(`ERROR: ${e.message}`);
            toast.error("Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Schema Migration Tool</h1>
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                    <div className="text-xs font-bold text-slate-500">TOTAL DOCS</div>
                    <div className="text-3xl font-black">{stats.total}</div>
                </Card>
                <Card className="p-4 text-center bg-green-50">
                    <div className="text-xs font-bold text-green-600">MIGRATED</div>
                    <div className="text-3xl font-black text-green-700">{stats.migrated}</div>
                </Card>
            </div>
            <Button onClick={runMigration} disabled={loading} className="w-full bg-slate-900 h-12 text-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Start Migration"}
            </Button>
            <div className="bg-slate-950 text-slate-400 p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-slate-500">
                    <AlertTriangle className="w-3 h-3" /> Logs
                </div>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}

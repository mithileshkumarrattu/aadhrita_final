import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Re-use logic from summary.ts or scoreboard
const isMvgrCollege = (collegeName: any, email?: string) => {
    const c = String(collegeName || '').toUpperCase();
    if (c.includes('MVGR') || c.includes('MAHARAJ') || c.includes('VIJAYARAM') || c.includes('GAJAPATHI')) return true;
    if (email && String(email).toLowerCase().endsWith('@mvgrce.edu.in')) return true;
    return false;
};

const normDept = (raw: any): string => {
    if (!raw) return 'OTHER';
    const s = String(raw).toUpperCase().trim();
    if (
        s.includes('CSD') || s.includes('DATA SCIE') || s.includes('DATA ENG') || s === 'DE' ||
        s.includes('CSM') || s.includes('MACHINE') || s.includes('ML') || s.includes('ARTIFICIAL') ||
        s.includes('CIC') || s.includes('IOT') || s.includes('CYBER') || s.includes('CC') ||
        s.includes('CSAM') || (s.includes('AI') && s.includes('M'))
    ) {
        return 'DATA ENGINEERING';
    }
    if (s.startsWith('CS') || s === 'COMPUTER SCIENCE' || s.includes('COMPUTER SCIENCE AND ENGINEERING')) return 'CSE';
    if (s.startsWith('ECE') || s.includes('ELECTRONICS')) return 'ECE';
    if (s.startsWith('EEE') || s.includes('ELECTRICAL')) return 'EEE';
    if (s.includes('MECH')) return 'MECH';
    if (s.includes('CIVIL') || s.includes('CVIL')) return 'CIVIL';
    if (s === 'IT' || s.includes('INFORM') || s.includes('IECT') || s.includes('IE&CT') || s.includes('IE & CT')) return 'IE&CT';
    if (s.includes('MBA') || s.includes('BUSINESS')) return 'MBA';
    if (s.includes('CHE')) return 'CHEMICAL';
    return 'OTHER';
};

export async function GET() {
    try {
        const snap = await adminDb.collection('users').get();
        const counts: Record<string, number> = {};

        snap.forEach(doc => {
            const d = doc.data();
            if (!isMvgrCollege(d.collegeName, d.email)) return;
            // Only count registered / onboarded users
            if (!d.isOnboarded && !d.hasEntryPass && !d.hasHackathonPass && !d.completed) return;

            const b = d.degreeBranch || d.branch || d.department || d.dept || '';
            const dept = normDept(b);
            counts[dept] = (counts[dept] || 0) + 1;
        });

        return NextResponse.json({ success: true, counts }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error: any) {
        console.error("Scoreboard API Error:", error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scoreboard data' }, { status: 500 });
    }
}

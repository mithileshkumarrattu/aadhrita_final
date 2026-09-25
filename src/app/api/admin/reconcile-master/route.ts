import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const log: string[] = [];
    try {
        log.push("Starting Master Reconciliation...");

        // 1. Restore 215 mistakes from reverted-ghosts.json
        const revertedPath = path.join(process.cwd(), 'reverted-ghosts.json');
        if (fs.existsSync(revertedPath)) {
            const data = JSON.parse(fs.readFileSync(revertedPath, 'utf8'));
            log.push(`Found ${data.length} records in reverted-ghosts.json`);
            let count = 0;
            const batch = adminDb.batch();
            for (const item of data) {
                const ref = adminDb.collection('registrations').doc(item.id);
                batch.update(ref, { paymentStatus: 'success' });
                count++;
                if (count % 400 === 0) await batch.commit();
            }
            await batch.commit();
            log.push(`Successfully restored ${count} registrations to success.`);
        }

        // 2. Fix Lady Titans Double Leader
        // Merge LADY_TITANS__9706 (case error) into Lady titans (correct one)
        const ladyTitansQuery = await adminDb.collection('registrations')
            .where('teamName', 'in', ['Lady titans', 'LADY_TITANS__9706', 'Lady Titans'])
            .get();

        log.push(`Found ${ladyTitansQuery.size} members for Lady Titans variations.`);
        const ladyTitansBatch = adminDb.batch();
        for (const doc of ladyTitansQuery.docs) {
            ladyTitansBatch.update(doc.ref, {
                teamName: 'Lady Titans',
                teamId: 'LADY_TITANS_MAIN'
            });
        }
        await ladyTitansBatch.commit();
        log.push("Unified Lady Titans into a single team ID.");

        // 3. Sync with Ideathon_Detailed_Report (1).xlsx
        const ideathonPath = path.join(process.cwd(), 'Ideathon_Copy.xlsx');
        if (fs.existsSync(ideathonPath)) {
            const workbook = xlsx.readFile(ideathonPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = xlsx.utils.sheet_to_json<any>(sheet);
            log.push(`Excel row count: ${jsonData.length}`);

            let matchedCount = 0;
            for (const row of jsonData) {
                const regNo = String(row['Registration Number'] || row['Reg No'] || '').trim();
                const email = String(row['Email'] || '').trim();

                if (regNo) {
                    const q = await adminDb.collection('registrations')
                        .where('registrationNumber', '==', regNo)
                        .get();

                    for (const doc of q.docs) {
                        if (doc.data().paymentStatus !== 'success') {
                            await doc.ref.update({ paymentStatus: 'success' });
                            matchedCount++;
                        }
                    }
                }
            }
            log.push(`Synchronized ${matchedCount} additional registrations from Excel.`);
        }

        return NextResponse.json({ success: true, log });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, log }, { status: 500 });
    }
}

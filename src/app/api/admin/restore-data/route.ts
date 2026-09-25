import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const results: any = { restored: [], skipped: [], errors: [] };

        // 1. Read the provided Ideathon report (Copied to avoid file locks from Excel)
        const ideathonPath = path.join(process.cwd(), 'Ideathon_Copy.xlsx');
        if (fs.existsSync(ideathonPath)) {
            const workbook = xlsx.readFile(ideathonPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(sheet);

            const regsSnapshot = await db.collection('events').doc('ideathon').collection('registrations').get();
            const allRegs = regsSnapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() }));

            for (const row of data as any[]) {
                const email = String(row['Email'] || '').trim().toLowerCase();
                const phone = String(row['Mobile Number'] || '').trim();
                const regNo = String(row['Registration Number'] || '').trim().toLowerCase();
                const paymentStatusOrig = String(row['Payment Status'] || '').trim().toLowerCase();

                // Only restore if they were SUCCESS or PAID in the excel sheet
                if (paymentStatusOrig !== 'success' && paymentStatusOrig !== 'paid') {
                    continue;
                }

                for (const regDoc of allRegs) {
                    const regData = regDoc.data;
                    const dEmail = String(regData.display?.email || regData.userSnapshot?.email || '').trim().toLowerCase();
                    const dPhone = String(regData.display?.phone || regData.userSnapshot?.phone || '').trim();
                    const dRegNo = String(regData.display?.regNo || regData.userSnapshot?.regNo || regData.display?.registrationNumber || '').trim().toLowerCase();

                    let match = false;
                    if (email && dEmail && dEmail === email) match = true;
                    if (phone && dPhone && dPhone.includes(phone.substring(0, 10))) match = true;
                    if (regNo && dRegNo && dRegNo === regNo) match = true;

                    if (match) {
                        if (regData.paymentStatus !== 'success' && regData.paymentStatus !== 'paid') {
                            await regDoc.ref.update({ paymentStatus: 'success' });
                            results.restored.push({ event: 'ideathon', id: regDoc.id, name: row['Full Name'] });
                            // Update our local cache so we don't process it twice
                            regDoc.data.paymentStatus = 'success';
                        }
                        break; // Found the user
                    }
                }
            }
        } else {
            results.errors.push("Ideathon excel missing at " + ideathonPath);
        }

        // 2. Read the global export from earlier today (Hardcoded absolute path to C drive)
        const globalRefinedPath = "C:\\Users\\rattu\\.gemini\\antigravity\\brain\\f56e6a45-92f3-4d9a-a823-adba402edb01\\Paid_Students_Export.xlsx";
        if (fs.existsSync(globalRefinedPath)) {
            const workbook = xlsx.readFile(globalRefinedPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(sheet);

            for (const row of data as any[]) {
                const docId = row['Reg Doc ID'];
                const eventId = row['Event ID'];
                if (docId && eventId && typeof docId === 'string' && typeof eventId === 'string') {
                    const regRef = db.collection('events').doc(eventId).collection('registrations').doc(docId);
                    const docSnap = await regRef.get();
                    if (docSnap.exists) {
                        const dData = docSnap.data();
                        if (dData && dData.paymentStatus !== 'success' && dData.paymentStatus !== 'paid') {
                            await regRef.update({ paymentStatus: 'success' });
                            results.restored.push({ event: eventId, id: docId, name: row['Name'] });
                        }
                    }
                }
            }
        } else {
            results.errors.push("Global excel missing at " + globalRefinedPath);
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

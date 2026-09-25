import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import fs from 'fs';

export async function GET() {
    try {
        const ideathonPath = require('path').join(process.cwd(), 'Ideathon_Detailed_Report (1).xlsx');
        let h1: string[] = [];
        if (fs.existsSync(ideathonPath)) {
            const workbook = xlsx.readFile(ideathonPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data: any[] = xlsx.utils.sheet_to_json(sheet);
            if (data.length > 0) h1 = Object.keys(data[0]);
        } else {
            h1 = ['file_not_found_ideathon'];
        }

        const globalRefinedPath = require('path').join(process.cwd(), '..', '..', '..', '..', 'Users', 'rattu', '.gemini', 'antigravity', 'brain', 'f56e6a45-92f3-4d9a-a823-adba402edb01', 'Paid_Students_Export.xlsx');
        let h2: string[] = [];
        if (fs.existsSync(globalRefinedPath)) {
            const workbook = xlsx.readFile(globalRefinedPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data: any[] = xlsx.utils.sheet_to_json(sheet);
            if (data.length > 0) h2 = Object.keys(data[0]);
        }

        return NextResponse.json({ ideathonHeaders: h1, globalHeaders: h2 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

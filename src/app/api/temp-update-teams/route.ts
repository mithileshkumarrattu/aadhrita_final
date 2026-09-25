// This route has been permanently disabled for security reasons.
// All data syncs must be done through authorized admin tools only.
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({ error: 'This endpoint has been disabled.' }, { status: 410 });
}

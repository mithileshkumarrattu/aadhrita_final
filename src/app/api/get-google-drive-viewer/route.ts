import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { fileUrl } = await request.json();

        if (!fileUrl || typeof fileUrl !== 'string') {
            return NextResponse.json({ success: false, error: "Invalid URL provided" }, { status: 400 });
        }

        // Extract file ID: /file/d/1ABC123/view → "1ABC123"
        // Supports common patterns: 
        // - https://drive.google.com/file/d/FILE_ID/view...
        // - https://drive.google.com/open?id=FILE_ID

        let fileId: string | null = null;

        // Pattern: /d/ID or id=ID
        // This catches /file/d/ID/view, /uc?id=ID, etc.
        const match = fileUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) || fileUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);

        if (match) {
            fileId = match[1];
        }

        if (!fileId) {
            return NextResponse.json({ success: false, error: "Could not extract File ID from URL" }, { status: 400 });
        }

        // Embeddable preview URL
        const viewerUrl = `https://drive.google.com/file/d/${fileId}/preview`;

        return NextResponse.json({ success: true, viewerUrl });
    } catch (error) {
        console.error("Error in get-google-drive-viewer:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}

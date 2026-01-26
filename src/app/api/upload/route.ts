
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
    try {
        console.log("Starting Cloudinary Upload...");

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        const userName = formData.get('userName') as string || 'student';

        const folder = formData.get('folder') as string || 'app_docs';

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Sanitize name for filename (remove spaces, special chars)
        // Sanitize name for filename (remove spaces, special chars)
        const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 20); // Cap username segment

        // Smart Truncate Filename
        const ext = file.name.split('.').pop() || '';
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9\-]/g, '_');
        const truncatedName = cleanName.length > 30 ? cleanName.substring(0, 30) : cleanName;
        const finalFileName = ext ? `${truncatedName}.${ext}` : truncatedName;

        // Add timestamp to ensure uniqueness
        const timestamp = Date.now();
        // Construct ID and ensure it doesn't exceed 255 chars (Cloudinary limit)
        // Structure: user_id_timestamp_filename
        let finalPublicId = `${sanitizedUserName}_${userId}_${timestamp}_${finalFileName}`;

        // Final Safety Net: Hard truncate from the end if somehow still too long, keeping unique prefix priority? 
        // Actually, user_id and timestamp are most critical for uniqueness.
        if (finalPublicId.length > 200) {
            finalPublicId = finalPublicId.substring(0, 200);
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    public_id: finalPublicId,
                    resource_type: 'auto',
                    use_filename: true,
                    unique_filename: false,
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary stream error:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            uploadStream.end(buffer);
        });

        const result: any = uploadResult;
        console.log("Cloudinary Upload success:", result.secure_url);

        return NextResponse.json({
            success: true,
            url: result.secure_url
        });

    } catch (error: any) {
        console.error('Cloudinary Upload Error:', error);
        return NextResponse.json({ error: `Upload Failed: ${error.message}` }, { status: 500 });
    }
}

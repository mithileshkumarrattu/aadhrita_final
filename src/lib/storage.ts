// Helper to upload files directly to Cloudinary (Client-Side)
// Bypasses Vercel Limits. Requires an Unsigned Upload Preset.

export const uploadFile = async (
    file: File,
    userId: string, // Kept for signature compatibility
    fileNamePrefix: string = '',
    folder: string = 'mvgr_uploads',
    resourceType: 'auto' | 'raw' | 'image' = 'auto',
    preset?: string
): Promise<string> => {

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = preset || process.env.NEXT_PUBLIC_CLOUDINARY_PRESET; // User must create this "Unsigned" preset

    if (!cloudName || !uploadPreset) {
        console.error("Cloudinary Configuration Missing", { cloudName, uploadPreset });
        throw new Error("System Configuration Error: Missing Cloudinary Preset");
    }

    // Construct a custom public_id to include the Team Name prefix
    // Note: for unsigned uploads, 'public_id' is only allowed if the preset enables it.
    // If the preset has "Public ID" (or similar) unrestricted, this works.
    // Since the user asked for this feature, we assume they want this naming.

    // Sanitize filename (remove special chars, spaces)
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const nameWithoutExt = sanitizedFileName.substring(0, sanitizedFileName.lastIndexOf('.')) || sanitizedFileName;

    // Final Public ID logic:
    // We override the File object's name property to match our desired public_id (prefix)
    // This serves as the fallback when 'public_id' param is ignored by unsigned presets.
    const finalFileName = fileNamePrefix ? `${fileNamePrefix}.jpg` : file.name;
    const renamedFile = new File([file], finalFileName, { type: file.type });

    const formData = new FormData();
    formData.append('file', renamedFile);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    // Attempt to set custom name via public_id (might be ignored)
    formData.append('public_id', fileNamePrefix || nameWithoutExt);

    // Optional: Add context or tags if needed
    // formData.append('context', `uploader=${userId}`);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cloudinary Upload Error", errorData);
            // If public_id is not allowed in unsigned preset, retrying without it might be a fallback,
            // but let's throw first so we know if it fails.
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error: any) {
        console.error("File Upload Error", error);
        throw new Error(error.message || 'File upload failed');
    }
};

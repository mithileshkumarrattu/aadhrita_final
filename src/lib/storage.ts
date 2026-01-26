// Helper to upload files via our API (Cloudinary/Drive)
export const uploadFile = async (
    file: File,
    userId: string,
    userName?: string,
    folder: string = 'id_cards',
    resourceType: 'auto' | 'raw' | 'image' = 'auto'
): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    if (userName) formData.append('userName', userName);
    formData.append('folder', folder);
    formData.append('resourceType', resourceType);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url; // This returns the Drive WebViewLink
};

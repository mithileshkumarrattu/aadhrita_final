import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://aadhrita.mvgrce.com'; // Or user's domain

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        // Intentionally NOT mapping other routes to focus SEO on the landing page
    ];
}

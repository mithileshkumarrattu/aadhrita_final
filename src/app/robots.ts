import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/faculty/', '/security/', '/dashboard/', '/pay/', '/register/'],
        },
        sitemap: 'https://aadhrita.mvgrce.com/sitemap.xml',
    };
}

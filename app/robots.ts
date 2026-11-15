import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || 'https://krishivumi-erp.bd';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/features', '/contact'],
        disallow: ['/erp/', '/api/', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import { fetchPosts } from "../lib/api";

export async function GET() {
    const siteUrl = import.meta.env.SITE;
    const posts = await fetchPosts();

    const result = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc></url>
  ${posts
            .map((post) => {
                if (!post.publishedAt) return '';
                let lastMod = (post.updatedAt ?? post.publishedAt)
                lastMod = new Date(lastMod).toISOString().split('T')[0];
                return `<url><loc>${siteUrl}/blog/${post.slug}</loc><lastmod>${lastMod}</lastmod></url>`;
            })
            .join('\n')}
    <url><loc>${siteUrl}/about/</loc></url>
</urlset>
  `.trim();

    return new Response(result, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}

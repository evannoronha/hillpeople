import type { APIRoute } from 'astro';
import { STRAPI_API_URL } from 'astro:env/server';

const STRAPI_MEDIA_HOST = 'competent-victory-0bdd9770d0.media.strapiapp.com';

// Cache for 1 year (immutable since Strapi URLs contain hashes)
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;

  if (!path) {
    return new Response('Not found', { status: 404 });
  }

  // Local uploads (e.g. /img/uploads/foo.jpg) go to Strapi API URL,
  // everything else goes to the Strapi Cloud media CDN
  const strapiUrl = path.startsWith('uploads/')
    ? `${STRAPI_API_URL}/${path}`
    : `https://${STRAPI_MEDIA_HOST}/${path}`;

  try {
    const response = await fetch(strapiUrl);

    if (!response.ok) {
      return new Response('Image not found', { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Error fetching image', { status: 500 });
  }
};

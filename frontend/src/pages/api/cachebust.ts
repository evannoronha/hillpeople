import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { clearResponseCache } from '../../lib/api';

// All cacheable URLs
const ALL_URLS = [
  '/',
  '/about',
  '/climbing',
  '/privacy',
  '/api/posts',
  '/api/ticklist-data',
  '/api/climbing-ticks',
];

interface CloudflarePurgeResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: { id: string };
}

export const GET: APIRoute = async () => {
  // Clear the in-memory isolate cache
  clearResponseCache();

  const zoneId = getSecret('CLOUDFLARE_ZONE_ID');
  const apiToken = getSecret('CLOUDFLARE_API_TOKEN');

  if (!zoneId || !apiToken) {
    // Still return success since we cleared the isolate cache
    return new Response(JSON.stringify({
      message: 'Isolate cache cleared (Cloudflare credentials not configured)',
      isolateCacheCleared: true,
      cloudflareCacheCleared: false,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert relative URLs to absolute URLs
  const baseUrl = 'https://hillpeople.net';
  const absoluteUrls = ALL_URLS.map(url => `${baseUrl}${url}`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: absoluteUrls }),
      }
    );

    const data = await response.json() as CloudflarePurgeResponse;

    if (!data.success) {
      const errorMsg = data.errors?.map(e => e.message).join(', ') || 'Unknown error';
      console.error('Cloudflare cache purge failed:', errorMsg);
      return new Response(JSON.stringify({
        error: 'Cache purge failed',
        details: errorMsg
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Full cache bust completed:', absoluteUrls);

    return new Response(JSON.stringify({
      message: 'All caches purged successfully',
      isolateCacheCleared: true,
      cloudflareCacheCleared: true,
      purged: ALL_URLS,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cache bust error:', error);
    return new Response(JSON.stringify({
      error: 'Cache purge failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

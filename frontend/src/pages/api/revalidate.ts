import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';

// Map content types to the URLs that need to be purged
const CONTENT_TYPE_URLS: Record<string, string[]> = {
  'post': ['/', '/api/posts'],
  'about': ['/about'],
  'home-page': ['/'],
  'site-settings': ['/', '/about', '/climbing', '/privacy'],
  'climbing-tick': ['/climbing', '/api/ticklist-data'],
  'climbing-goal': ['/climbing', '/api/ticklist-data'],
  'person': ['/climbing', '/api/ticklist-data'],
  'privacy-policy': ['/privacy'],
};

interface CloudflarePurgeResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: { id: string };
}

async function purgeCloudflareCache(urls: string[]): Promise<{ success: boolean; error?: string }> {
  const zoneId = getSecret('CLOUDFLARE_ZONE_ID');
  const apiToken = getSecret('CLOUDFLARE_API_TOKEN');

  if (!zoneId || !apiToken) {
    return { success: false, error: 'Missing Cloudflare credentials' };
  }

  // Convert relative URLs to absolute URLs
  const baseUrl = 'https://hillpeople.net';
  const absoluteUrls = urls.map(url => url.startsWith('/') ? `${baseUrl}${url}` : url);

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
      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export const POST: APIRoute = async ({ request }) => {
  // Verify the secret token
  const secret = getSecret('REVALIDATE_SECRET');
  const authHeader = request.headers.get('Authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (!secret || providedSecret !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse the webhook payload
  let payload: { model?: string; entry?: { slug?: string } };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = payload.model;
  if (!contentType) {
    return new Response(JSON.stringify({ error: 'Missing model in payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get URLs to purge for this content type
  const urlsToPurge = CONTENT_TYPE_URLS[contentType];
  if (!urlsToPurge) {
    // Unknown content type - nothing to purge
    return new Response(JSON.stringify({
      message: `No cache rules for content type: ${contentType}`,
      purged: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // For posts, also purge the specific blog post URL if slug is provided
  const allUrls = [...urlsToPurge];
  if (contentType === 'post' && payload.entry?.slug) {
    allUrls.push(`/blog/${payload.entry.slug}`);
  }

  // Purge Cloudflare cache
  const result = await purgeCloudflareCache(allUrls);

  if (!result.success) {
    console.error('Cloudflare cache purge failed:', result.error);
    return new Response(JSON.stringify({
      error: 'Cache purge failed',
      details: result.error
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`Cache purged for ${contentType}:`, allUrls);

  return new Response(JSON.stringify({
    message: 'Cache purged successfully',
    contentType,
    purged: allUrls,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { purgeCloudflareCache, CONTENT_TYPE_URLS } from '../../lib/cache';
import { doClear } from '../../lib/do-cache';

export const POST: APIRoute = async ({ request, locals }) => {
  console.log('Revalidate request received:', request.url);
  const runtime = locals.runtime;

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

  // Clear the Durable Object cache
  const doCacheCleared = await doClear(runtime);
  console.log('DO cache cleared:', doCacheCleared, 'entries');

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
    doCacheCleared,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

import { getSecret } from 'astro:env/server';
import { doClear } from './do-cache';

// Runtime context type for passing to cache functions
type Runtime = App.Locals['runtime'];

// All cacheable URLs
export const ALL_CACHEABLE_URLS = [
  '/',
  '/about',
  '/climbing',
  '/privacy',
  '/api/posts',
  '/api/ticklist-data',
  '/api/climbing-ticks',
];

// Map content types to the URLs that need to be purged
export const CONTENT_TYPE_URLS: Record<string, string[]> = {
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

export interface PurgeResult {
  success: boolean;
  error?: string;
  isolateCacheCleared: boolean;
  cloudflareCacheCleared: boolean;
  purgedUrls?: string[];
}

/**
 * Purge Cloudflare edge cache for the given URLs
 */
export async function purgeCloudflareCache(urls: string[]): Promise<{ success: boolean; error?: string }> {
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

/**
 * Clear all caches (Durable Object + Cloudflare edge)
 */
export async function bustAllCaches(runtime?: Runtime): Promise<PurgeResult> {
  // Clear the Durable Object cache
  let doCacheCleared = 0;
  if (runtime) {
    doCacheCleared = await doClear(runtime);
    console.log('DO cache cleared:', doCacheCleared, 'entries');
  } else {
    console.warn('No runtime context, skipping DO cache clear');
  }

  // Purge Cloudflare cache
  const cfResult = await purgeCloudflareCache(ALL_CACHEABLE_URLS);

  if (!cfResult.success) {
    console.error('Cloudflare cache purge failed:', cfResult.error);
    return {
      success: true, // Still partial success - DO cache was cleared
      isolateCacheCleared: doCacheCleared > 0,
      cloudflareCacheCleared: false,
      error: cfResult.error,
      purgedUrls: [],
    };
  }

  console.log('Full cache bust completed:', ALL_CACHEABLE_URLS);

  return {
    success: true,
    isolateCacheCleared: doCacheCleared > 0,
    cloudflareCacheCleared: true,
    purgedUrls: ALL_CACHEABLE_URLS,
  };
}

import { getSecret } from 'astro:env/server';
import { clearDOCache } from './do-cache';

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
  doCacheCleared: boolean;
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
export async function bustAllCaches(locals?: App.Locals): Promise<PurgeResult> {
  // Clear the Durable Object cache (shared across all isolates)
  let doCacheCleared = false;
  if (locals) {
    doCacheCleared = await clearDOCache(locals);
  } else {
    console.warn('No locals provided - DO cache not cleared');
  }

  // Purge Cloudflare edge cache
  const cfResult = await purgeCloudflareCache(ALL_CACHEABLE_URLS);

  if (!cfResult.success) {
    console.error('Cloudflare cache purge failed:', cfResult.error);
    return {
      success: doCacheCleared, // Partial success if DO cache was cleared
      doCacheCleared,
      cloudflareCacheCleared: false,
      error: cfResult.error,
      purgedUrls: [],
    };
  }

  console.log('Full cache bust completed:', ALL_CACHEABLE_URLS);

  return {
    success: true,
    doCacheCleared,
    cloudflareCacheCleared: true,
    purgedUrls: ALL_CACHEABLE_URLS,
  };
}

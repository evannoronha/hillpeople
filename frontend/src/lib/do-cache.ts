/**
 * Durable Object cache helper functions.
 *
 * Provides a simple interface for getting, setting, and clearing cached
 * Strapi API responses via the StrapiCache Durable Object.
 */

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheGetResponse {
  hit: boolean;
  data?: unknown;
}

interface CacheClearResponse {
  cleared: boolean;
  entriesRemoved: number;
}

/**
 * Get the Durable Object stub for the global cache instance.
 * Returns null if the binding is not available (e.g., in local dev without wrangler).
 */
function getCacheStub(locals: App.Locals): DurableObjectStub | null {
  // Astro Cloudflare adapter provides env via runtime.env
  const env = locals?.runtime?.env;
  if (!env?.STRAPI_CACHE) {
    console.debug('DO cache binding not available');
    return null;
  }
  const id = env.STRAPI_CACHE.idFromName('global-cache');
  return env.STRAPI_CACHE.get(id);
}

/**
 * Get a cached response from the Durable Object.
 * Returns null if not cached or cache binding unavailable.
 */
export async function getCached<T>(
  locals: App.Locals,
  key: string
): Promise<T | null> {
  const stub = getCacheStub(locals);
  if (!stub) {
    return null;
  }

  try {
    const response = await stub.fetch(
      `https://cache/get?key=${encodeURIComponent(key)}`
    );
    const result = (await response.json()) as CacheGetResponse;
    return result.hit ? (result.data as T) : null;
  } catch (error) {
    console.error('DO cache get error:', error);
    return null;
  }
}

/**
 * Store a response in the Durable Object cache.
 */
export async function setCached<T>(
  locals: App.Locals,
  key: string,
  data: T
): Promise<void> {
  const stub = getCacheStub(locals);
  if (!stub) {
    return;
  }

  try {
    await stub.fetch('https://cache/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data, ttl: CACHE_TTL_MS }),
    });
  } catch (error) {
    console.error('DO cache set error:', error);
  }
}

/**
 * Clear all entries from the Durable Object cache.
 * Returns true if cleared successfully, false otherwise.
 */
export async function clearDOCache(locals: App.Locals): Promise<boolean> {
  const stub = getCacheStub(locals);
  if (!stub) {
    console.warn('DO cache binding not available - skipping clear');
    return false;
  }

  try {
    const response = await stub.fetch('https://cache/clear', {
      method: 'POST',
    });
    const result = (await response.json()) as CacheClearResponse;
    console.log(`DO cache cleared: ${result.entriesRemoved} entries removed`);
    return result.cleared;
  } catch (error) {
    console.error('DO cache clear error:', error);
    return false;
  }
}

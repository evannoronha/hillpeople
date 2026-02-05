import type { CacheStore } from '../CacheStore';

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

// Singleton DO stub ID - all requests go to the same instance
const CACHE_STORE_ID = 'global-cache';

interface CacheGetResult {
  hit: boolean;
  data?: unknown;
  ttlRemaining?: number;
}

interface CacheStatsResult {
  memoryEntries: number;
  storageEntries: number;
}

/**
 * Get the CacheStore Durable Object stub from the runtime environment.
 * Returns null if the binding is not available (e.g., in local dev without DO).
 */
function getCacheStoreStub(runtime: App.Locals['runtime']): DurableObjectStub<CacheStore> | null {
  const env = runtime?.env as { CACHE_STORE?: DurableObjectNamespace<CacheStore> } | undefined;
  if (!env?.CACHE_STORE) {
    return null;
  }
  const id = env.CACHE_STORE.idFromName(CACHE_STORE_ID);
  return env.CACHE_STORE.get(id);
}

/**
 * Get a cached value from the Durable Object cache.
 * Falls back gracefully if DO is unavailable.
 */
export async function doGet(
  runtime: App.Locals['runtime'],
  key: string
): Promise<CacheGetResult> {
  const stub = getCacheStoreStub(runtime);
  if (!stub) {
    console.debug('DO cache not available, cache miss for:', key);
    return { hit: false };
  }

  try {
    const response = await stub.fetch(`http://cache/get?key=${encodeURIComponent(key)}`);
    if (!response.ok) {
      console.warn('DO cache get failed:', response.status);
      return { hit: false };
    }
    return await response.json() as CacheGetResult;
  } catch (error) {
    console.warn('DO cache get error:', error);
    return { hit: false };
  }
}

/**
 * Set a value in the Durable Object cache.
 * Silently fails if DO is unavailable.
 */
export async function doSet(
  runtime: App.Locals['runtime'],
  key: string,
  data: unknown,
  ttlMs: number = CACHE_TTL_MS
): Promise<boolean> {
  const stub = getCacheStoreStub(runtime);
  if (!stub) {
    console.debug('DO cache not available, skipping set for:', key);
    return false;
  }

  try {
    const response = await stub.fetch('http://cache/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data, ttlMs }),
    });
    return response.ok;
  } catch (error) {
    console.warn('DO cache set error:', error);
    return false;
  }
}

/**
 * Delete specific keys from the Durable Object cache.
 */
export async function doDelete(
  runtime: App.Locals['runtime'],
  keys: string[]
): Promise<number> {
  const stub = getCacheStoreStub(runtime);
  if (!stub) {
    console.debug('DO cache not available, skipping delete');
    return 0;
  }

  try {
    const response = await stub.fetch('http://cache/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    });
    if (!response.ok) {
      return 0;
    }
    const result = await response.json() as { deleted: number };
    return result.deleted;
  } catch (error) {
    console.warn('DO cache delete error:', error);
    return 0;
  }
}

/**
 * Clear all entries from the Durable Object cache.
 */
export async function doClear(runtime: App.Locals['runtime']): Promise<number> {
  const stub = getCacheStoreStub(runtime);
  if (!stub) {
    console.debug('DO cache not available, skipping clear');
    return 0;
  }

  try {
    const response = await stub.fetch('http://cache/clear', {
      method: 'POST',
    });
    if (!response.ok) {
      return 0;
    }
    const result = await response.json() as { cleared: number };
    console.log('DO cache cleared:', result.cleared, 'entries');
    return result.cleared;
  } catch (error) {
    console.warn('DO cache clear error:', error);
    return 0;
  }
}

/**
 * Get cache statistics from the Durable Object.
 */
export async function doStats(runtime: App.Locals['runtime']): Promise<CacheStatsResult | null> {
  const stub = getCacheStoreStub(runtime);
  if (!stub) {
    return null;
  }

  try {
    const response = await stub.fetch('http://cache/stats');
    if (!response.ok) {
      return null;
    }
    return await response.json() as CacheStatsResult;
  } catch (error) {
    console.warn('DO cache stats error:', error);
    return null;
  }
}

export { CACHE_TTL_MS };

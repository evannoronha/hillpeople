import { DurableObject } from 'cloudflare:workers';

interface CachedEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Durable Object for shared API response caching across all Workers.
 *
 * This replaces the per-isolate Map cache with a globally consistent cache
 * that persists across isolate recycles and is shared by all requests.
 */
export class CacheStore extends DurableObject {
  // In-memory cache for hot data (avoids storage reads for frequently accessed entries)
  private memoryCache: Map<string, CachedEntry> = new Map();

  /**
   * Get a cached entry by key
   */
  async get(key: string): Promise<{ hit: boolean; data?: unknown; ttlRemaining?: number }> {
    const now = Date.now();

    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (memEntry.expiresAt > now) {
        return {
          hit: true,
          data: memEntry.data,
          ttlRemaining: Math.round((memEntry.expiresAt - now) / 1000),
        };
      }
      // Expired - remove from memory
      this.memoryCache.delete(key);
    }

    // Check persistent storage
    const stored = await this.ctx.storage.get<CachedEntry>(key);
    if (stored && stored.expiresAt > now) {
      // Populate memory cache for subsequent requests
      this.memoryCache.set(key, stored);
      return {
        hit: true,
        data: stored.data,
        ttlRemaining: Math.round((stored.expiresAt - now) / 1000),
      };
    }

    // Expired or not found - clean up storage if needed
    if (stored) {
      await this.ctx.storage.delete(key);
    }

    return { hit: false };
  }

  /**
   * Set a cache entry with TTL
   */
  async set(key: string, data: unknown, ttlMs: number): Promise<void> {
    const entry: CachedEntry = {
      data,
      expiresAt: Date.now() + ttlMs,
    };

    // Store in both memory and persistent storage
    this.memoryCache.set(key, entry);
    await this.ctx.storage.put(key, entry);
  }

  /**
   * Delete specific cache entries by key pattern
   */
  async delete(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.memoryCache.has(key)) {
        this.memoryCache.delete(key);
        deleted++;
      }
      await this.ctx.storage.delete(key);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<number> {
    const count = this.memoryCache.size;
    this.memoryCache.clear();
    await this.ctx.storage.deleteAll();
    return count;
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{ memoryEntries: number; storageEntries: number }> {
    const storageKeys = await this.ctx.storage.list();
    return {
      memoryEntries: this.memoryCache.size,
      storageEntries: storageKeys.size,
    };
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'GET' && path === '/get') {
        const key = url.searchParams.get('key');
        if (!key) {
          return Response.json({ error: 'Missing key parameter' }, { status: 400 });
        }
        const result = await this.get(key);
        return Response.json(result);
      }

      if (request.method === 'POST' && path === '/set') {
        const body = await request.json() as { key: string; data: unknown; ttlMs: number };
        if (!body.key || body.data === undefined || !body.ttlMs) {
          return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }
        await this.set(body.key, body.data, body.ttlMs);
        return Response.json({ success: true });
      }

      if (request.method === 'POST' && path === '/delete') {
        const body = await request.json() as { keys: string[] };
        if (!body.keys || !Array.isArray(body.keys)) {
          return Response.json({ error: 'Missing keys array' }, { status: 400 });
        }
        const deleted = await this.delete(body.keys);
        return Response.json({ success: true, deleted });
      }

      if (request.method === 'POST' && path === '/clear') {
        const cleared = await this.clear();
        return Response.json({ success: true, cleared });
      }

      if (request.method === 'GET' && path === '/stats') {
        const stats = await this.stats();
        return Response.json(stats);
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ error: message }, { status: 500 });
    }
  }
}

/**
 * Durable Object for unified Strapi API response caching.
 *
 * This provides a single cache instance shared across all Worker isolates,
 * enabling instant cache invalidation that affects all requests globally.
 */
import { DurableObject } from 'cloudflare:workers';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

interface SetRequest {
  key: string;
  data: unknown;
  ttl: number;
}

export class StrapiCache extends DurableObject {
  private cache: Map<string, CacheEntry> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.pathname.slice(1); // 'get', 'set', or 'clear'

    switch (action) {
      case 'get': {
        const key = url.searchParams.get('key');
        if (!key) {
          return Response.json({ error: 'Missing key' }, { status: 400 });
        }

        const entry = this.cache.get(key);
        const now = Date.now();

        if (!entry || entry.expiresAt < now) {
          if (entry) {
            this.cache.delete(key);
            console.log(`DO Cache EXPIRED: ${key}`);
          } else {
            console.log(`DO Cache MISS: ${key}`);
          }
          return Response.json({ hit: false });
        }

        const ttlRemaining = Math.round((entry.expiresAt - now) / 1000);
        console.log(`DO Cache HIT (TTL: ${ttlRemaining}s): ${key}`);
        return Response.json({ hit: true, data: entry.data });
      }

      case 'set': {
        const { key, data, ttl } = (await request.json()) as SetRequest;
        if (!key || data === undefined || !ttl) {
          return Response.json(
            { error: 'Missing key, data, or ttl' },
            { status: 400 }
          );
        }

        this.cache.set(key, {
          data,
          expiresAt: Date.now() + ttl,
        });
        console.log(`DO Cache SET: ${key} (TTL: ${ttl / 1000}s)`);
        return Response.json({ success: true });
      }

      case 'clear': {
        const previousSize = this.cache.size;
        this.cache.clear();
        console.log(`DO Cache CLEARED: ${previousSize} entries removed`);
        return Response.json({ cleared: true, entriesRemoved: previousSize });
      }

      case 'stats': {
        // Utility endpoint for debugging
        const now = Date.now();
        let activeEntries = 0;
        let expiredEntries = 0;

        for (const [, entry] of this.cache) {
          if (entry.expiresAt > now) {
            activeEntries++;
          } else {
            expiredEntries++;
          }
        }

        return Response.json({
          totalEntries: this.cache.size,
          activeEntries,
          expiredEntries,
        });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  }
}

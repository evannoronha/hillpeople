/**
 * Durable Object for unified Strapi API response caching.
 *
 * This provides a single cache instance shared across all Worker isolates,
 * enabling instant cache invalidation that affects all requests globally.
 *
 * Uses SQLite storage for persistence across DO evictions, with an in-memory
 * Map as a read-through cache for fast lookups within a single activation.
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
  private initialized = false;

  /**
   * Initialize the SQLite table on first use.
   */
  private ensureTable() {
    if (this.initialized) return;
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )`
    );
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureTable();
    const url = new URL(request.url);
    const action = url.pathname.slice(1);

    switch (action) {
      case 'get': {
        const key = url.searchParams.get('key');
        if (!key) {
          return Response.json({ error: 'Missing key' }, { status: 400 });
        }

        const now = Date.now();

        // Check in-memory cache first
        const memEntry = this.cache.get(key);
        if (memEntry) {
          if (memEntry.expiresAt < now) {
            this.cache.delete(key);
            this.ctx.storage.sql.exec('DELETE FROM cache WHERE key = ?', key);
            console.log(`DO Cache EXPIRED: ${key}`);
            return Response.json({ hit: false });
          }
          const ttlRemaining = Math.round((memEntry.expiresAt - now) / 1000);
          console.log(`DO Cache HIT (TTL: ${ttlRemaining}s): ${key}`);
          return Response.json({ hit: true, data: memEntry.data });
        }

        // Fall through to SQLite
        const rows = this.ctx.storage.sql.exec(
          'SELECT data, expires_at FROM cache WHERE key = ?',
          key
        ).toArray();

        if (rows.length === 0) {
          console.log(`DO Cache MISS: ${key}`);
          return Response.json({ hit: false });
        }

        const row = rows[0];
        const expiresAt = row.expires_at as number;

        if (expiresAt < now) {
          this.ctx.storage.sql.exec('DELETE FROM cache WHERE key = ?', key);
          console.log(`DO Cache EXPIRED: ${key}`);
          return Response.json({ hit: false });
        }

        // Populate in-memory cache from SQLite
        const data = JSON.parse(row.data as string);
        this.cache.set(key, { data, expiresAt });

        const ttlRemaining = Math.round((expiresAt - now) / 1000);
        console.log(`DO Cache HIT (TTL: ${ttlRemaining}s, from storage): ${key}`);
        return Response.json({ hit: true, data });
      }

      case 'set': {
        const { key, data, ttl } = (await request.json()) as SetRequest;
        if (!key || data === undefined || !ttl) {
          return Response.json(
            { error: 'Missing key, data, or ttl' },
            { status: 400 }
          );
        }

        const expiresAt = Date.now() + ttl;

        // Write to both in-memory and SQLite
        this.cache.set(key, { data, expiresAt });
        this.ctx.storage.sql.exec(
          `INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?, ?, ?)`,
          key,
          JSON.stringify(data),
          expiresAt
        );

        console.log(`DO Cache SET: ${key} (TTL: ${ttl / 1000}s)`);
        return Response.json({ success: true });
      }

      case 'clear': {
        const result = this.ctx.storage.sql.exec('SELECT COUNT(*) as count FROM cache').toArray();
        const previousSize = (result[0]?.count as number) || 0;

        this.cache.clear();
        this.ctx.storage.sql.exec('DELETE FROM cache');

        console.log(`DO Cache CLEARED: ${previousSize} entries removed`);
        return Response.json({ cleared: true, entriesRemoved: previousSize });
      }

      case 'stats': {
        const now = Date.now();
        const totalResult = this.ctx.storage.sql.exec('SELECT COUNT(*) as count FROM cache').toArray();
        const activeResult = this.ctx.storage.sql.exec(
          'SELECT COUNT(*) as count FROM cache WHERE expires_at > ?', now
        ).toArray();

        const totalEntries = (totalResult[0]?.count as number) || 0;
        const activeEntries = (activeResult[0]?.count as number) || 0;

        return Response.json({
          totalEntries,
          activeEntries,
          expiredEntries: totalEntries - activeEntries,
        });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  }
}

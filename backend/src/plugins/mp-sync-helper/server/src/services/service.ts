import type { Core } from '@strapi/strapi';
import { parseCSV, createTickId } from './csv-parser';

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },

  async syncAllPeople(months?: number): Promise<Array<{ person: string; result: SyncResult }>> {
    const start = Date.now();
    const people = await strapi.documents('api::person.person').findMany({
      filters: {
        mountainProjectUserId: { $notNull: true, $ne: '' }
      }
    });

    const results: Array<{ person: string; result: SyncResult }> = [];

    // Suppress per-tick cache invalidation during bulk sync;
    // a single invalidation fires at the end if anything changed.
    (globalThis as any).__suppressCacheInvalidation = true;
    try {
      for (const person of people) {
        const label = months ? `Quick syncing (last ${months} months)` : 'Syncing';
        strapi.log.info(`${label} ticks for ${person.name}`);
        const result = await this.syncPersonTicks(person.documentId, months);
        results.push({ person: person.name, result });
      }
    } finally {
      (globalThis as any).__suppressCacheInvalidation = false;
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    strapi.log.info(`Sync completed in ${elapsed}s (${people.length} people)`);

    // Single cache invalidation if any ticks were created or updated
    const anyChanges = results.some(({ result }) => result.created > 0 || result.updated > 0);
    if (anyChanges) {
      const revalidateUrl = process.env.FRONTEND_REVALIDATE_URL;
      const revalidateSecret = process.env.REVALIDATE_SECRET;
      if (revalidateUrl && revalidateSecret) {
        try {
          const res = await fetch(revalidateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${revalidateSecret}`,
            },
            body: JSON.stringify({ model: 'climbing-tick' }),
          });
          if (res.ok) {
            strapi.log.info('Cache invalidated for climbing-tick');
          } else {
            strapi.log.warn(`Cache invalidation failed: ${res.status}`);
          }
        } catch (err: any) {
          strapi.log.error(`Cache invalidation error: ${err.message}`);
        }
      }
    }

    return results;
  },

  async syncPersonTicks(personDocumentId: string, months?: number): Promise<SyncResult> {
    const person = await strapi.documents('api::person.person').findOne({
      documentId: personDocumentId,
    });

    if (!person) {
      throw new Error('Person not found');
    }

    if (!person.mountainProjectUserId) {
      throw new Error('Person has no Mountain Project user ID');
    }

    const csvUrl = `https://www.mountainproject.com/user/${person.mountainProjectUserId}/_/tick-export`;
    strapi.log.info(`Fetching ticks from ${csvUrl}`);

    let csvText: string;
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      csvText = await response.text();
    } catch (fetchError: any) {
      await strapi.documents('api::person.person').update({
        documentId: personDocumentId,
        data: {
          lastSyncError: `Failed to fetch CSV: ${fetchError.message}`,
          lastSyncErrorDate: new Date().toISOString(),
        } as any
      });

      strapi.log.error('Failed to fetch Mountain Project CSV', {
        personId: personDocumentId,
        error: fetchError.message
      });

      throw fetchError;
    }

    let ticks = parseCSV(csvText);
    strapi.log.info(`Parsed ${ticks.length} ticks from CSV`);

    if (months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const before = ticks.length;
      ticks = ticks.filter(t => t.date >= cutoffStr);
      strapi.log.info(`Filtered to ${ticks.length} ticks (from ${before}) within last ${months} months`);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Track occurrences of identical ticks (same route, date, style) for unique IDs
    const tickIdCounts = new Map<string, number>();

    for (const tick of ticks) {
      try {
        let route = await strapi.documents('api::climbing-route.climbing-route').findFirst({
          filters: { mountainProjectUrl: tick.url }
        });

        if (!route) {
          route = await strapi.documents('api::climbing-route.climbing-route').create({
            data: {
              name: tick.route,
              mountainProjectUrl: tick.url,
              rating: tick.rating,
              ratingCode: tick.ratingCode,
              routeType: tick.routeType,
              location: tick.location,
              avgStars: tick.avgStars,
              length: tick.length,
            }
          });
          strapi.log.debug(`Created route: ${tick.route}`);
        }

        const baseTickId = createTickId(personDocumentId, tick.date, tick.url, tick.style, tick.leadStyle);
        const occurrence = (tickIdCounts.get(baseTickId) || 0) + 1;
        tickIdCounts.set(baseTickId, occurrence);
        const tickId = createTickId(personDocumentId, tick.date, tick.url, tick.style, tick.leadStyle, occurrence);

        const existingTick = await strapi.documents('api::climbing-tick.climbing-tick').findFirst({
          filters: { mountainProjectTickId: tickId }
        });

        if (existingTick) {
          await strapi.documents('api::climbing-tick.climbing-tick').update({
            documentId: existingTick.documentId,
            data: {
              yourStars: tick.yourStars,
              yourRating: tick.yourRating,
              mpNotes: tick.notes,
              pitches: tick.pitches,
            } as any
          });
          updated++;
        } else {
          await strapi.documents('api::climbing-tick.climbing-tick').create({
            data: {
              tickDate: tick.date,
              route: route.documentId,
              person: personDocumentId,
              style: tick.style,
              leadStyle: tick.leadStyle,
              yourStars: tick.yourStars,
              yourRating: tick.yourRating,
              mpNotes: tick.notes,
              notes: tick.notes,
              pitches: tick.pitches,
              mountainProjectTickId: tickId,
            } as any
          });
          created++;
        }
      } catch (tickError: any) {
        strapi.log.warn(`Failed to process tick: ${tick.route} on ${tick.date}`, { error: tickError.message });
        skipped++;
      }
    }

    await strapi.documents('api::person.person').update({
      documentId: personDocumentId,
      data: {
        lastSyncDate: new Date().toISOString(),
        lastSyncError: null,
        lastSyncErrorDate: null,
      } as any
    });

    strapi.log.info(`Sync complete for ${person.name}: ${created} created, ${updated} updated, ${skipped} skipped`);

    return {
      success: true,
      created,
      updated,
      skipped,
      total: ticks.length,
    };
  },
});

export default service;

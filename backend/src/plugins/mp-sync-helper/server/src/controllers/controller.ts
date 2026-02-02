import type { Core } from '@strapi/strapi';
import { parseCSV, createTickId } from '../services/csv-parser';

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('mp-sync-helper')
      .service('service')
      .getWelcomeMessage();
  },

  async syncAll(ctx) {
    try {
      const people = await strapi.documents('api::person.person').findMany({
        filters: {
          mountainProjectUserId: { $notNull: true, $ne: '' }
        }
      });

      const results: Array<{ person: string; result: SyncResult }> = [];

      for (const person of people) {
        strapi.log.info(`Syncing ticks for ${person.name}`);
        const result = await syncPersonTicks(strapi, person.documentId);
        results.push({ person: person.name, result });
      }

      ctx.body = { success: true, results };
    } catch (error: any) {
      strapi.log.error('Sync all failed', { error });
      ctx.throw(500, 'Sync failed', { error: error.message });
    }
  },
});

async function syncPersonTicks(strapi: Core.Strapi, personDocumentId: string): Promise<SyncResult> {
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

  const ticks = parseCSV(csvText);
  strapi.log.info(`Parsed ${ticks.length} ticks from CSV`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

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
            pitches: tick.pitches,
            length: tick.length,
          }
        });
        strapi.log.debug(`Created route: ${tick.route}`);
      }

      const tickId = createTickId(personDocumentId, tick.date, tick.url);

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
}

export default controller;

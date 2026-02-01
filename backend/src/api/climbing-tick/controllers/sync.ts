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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync climbing ticks for a specific person
   */
  async syncPerson(ctx) {
    const { personId } = ctx.params;

    try {
      const result = await syncPersonTicks(strapi, personId);
      return result;
    } catch (error) {
      strapi.log.error('Sync failed for person', { personId, error });
      return ctx.badRequest('Sync failed', { error: error.message });
    }
  },

  /**
   * Sync climbing ticks for all people with Mountain Project user IDs
   */
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

      return { success: true, results };
    } catch (error) {
      strapi.log.error('Sync all failed', { error });
      return ctx.badRequest('Sync failed', { error: error.message });
    }
  }
});

/**
 * Core sync logic for a single person
 */
async function syncPersonTicks(strapi: Core.Strapi, personDocumentId: string): Promise<SyncResult> {
  // Get person with MP user ID
  const person = await strapi.documents('api::person.person').findOne({
    documentId: personDocumentId,
  });

  if (!person) {
    throw new Error('Person not found');
  }

  if (!person.mountainProjectUserId) {
    throw new Error('Person has no Mountain Project user ID');
  }

  // Fetch CSV from Mountain Project
  // URL requires a slug after user ID, but it can be anything - using underscore placeholder
  const csvUrl = `https://www.mountainproject.com/user/${person.mountainProjectUserId}/_/tick-export`;
  strapi.log.info(`Fetching ticks from ${csvUrl}`);

  let csvText: string;
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    csvText = await response.text();
  } catch (fetchError) {
    // Record the error on the person
    await strapi.documents('api::person.person').update({
      documentId: personDocumentId,
      data: {
        lastSyncError: `Failed to fetch CSV: ${fetchError.message}`,
        lastSyncErrorDate: new Date().toISOString(),
      }
    });

    // TODO: Send email alert via newsletter worker
    strapi.log.error('Failed to fetch Mountain Project CSV', {
      personId: personDocumentId,
      error: fetchError.message
    });

    throw fetchError;
  }

  // Parse CSV
  const ticks = parseCSV(csvText);
  strapi.log.info(`Parsed ${ticks.length} ticks from CSV`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tick of ticks) {
    try {
      // Upsert route
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

      // Create unique tick ID for deduplication
      const tickId = createTickId(personDocumentId, tick.date, tick.url);

      // Check if tick exists
      const existingTick = await strapi.documents('api::climbing-tick.climbing-tick').findFirst({
        filters: { mountainProjectTickId: tickId }
      });

      if (existingTick) {
        // Update only MP-sourced fields (yourStars, yourRating, mpNotes)
        // Preserve local notes and photos
        await strapi.documents('api::climbing-tick.climbing-tick').update({
          documentId: existingTick.documentId,
          data: {
            yourStars: tick.yourStars,
            yourRating: tick.yourRating,
            mpNotes: tick.notes,
            // Don't update: notes, photos (local overrides)
          }
        });
        updated++;
      } else {
        // Create new tick
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
            notes: tick.notes, // Default to MP notes, can be overridden
            mountainProjectTickId: tickId,
          }
        });
        created++;
      }
    } catch (tickError) {
      strapi.log.warn(`Failed to process tick: ${tick.route} on ${tick.date}`, { error: tickError.message });
      skipped++;
    }
  }

  // Update last sync date (success)
  await strapi.documents('api::person.person').update({
    documentId: personDocumentId,
    data: {
      lastSyncDate: new Date().toISOString(),
      lastSyncError: null,
      lastSyncErrorDate: null,
    }
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

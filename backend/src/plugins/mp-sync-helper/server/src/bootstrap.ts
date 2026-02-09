import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.cron.add({
    mpQuickSync: {
      task: async ({ strapi }: { strapi: Core.Strapi }) => {
        try {
          strapi.log.info('[MP Sync CRON] Running hourly quick sync (last 12 months)...');
          const syncService = strapi.plugin('mp-sync-helper').service('service');
          const results = await syncService.syncAllPeople(12);
          for (const { person, result } of results) {
            strapi.log.info(
              `[MP Sync CRON] ${person}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
            );
          }
          const anyChanges = results.some(({ result }) => result.created > 0 || result.updated > 0);
          if (anyChanges) {
            const revalidateUrl = process.env.FRONTEND_REVALIDATE_URL;
            const revalidateSecret = process.env.REVALIDATE_SECRET;
            if (revalidateUrl && revalidateSecret) {
              const res = await fetch(revalidateUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${revalidateSecret}`,
                },
                body: JSON.stringify({ model: 'climbing-tick' }),
              });
              if (res.ok) {
                strapi.log.info('[MP Sync CRON] Cache invalidated');
              } else {
                strapi.log.warn(`[MP Sync CRON] Cache invalidation failed: ${res.status}`);
              }
            }
          }
        } catch (error: any) {
          strapi.log.error(`[MP Sync CRON] Failed: ${error.message}`);
        }
      },
      options: {
        rule: '0 * * * *',
      },
    },
  });

  strapi.log.info('[MP Sync] Plugin bootstrapped, cron registered (0 * * * *)');
};

export default bootstrap;

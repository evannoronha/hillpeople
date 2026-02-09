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

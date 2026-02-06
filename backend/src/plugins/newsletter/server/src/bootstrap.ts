import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.cron.add({
    newsletterAutoSend: {
      task: async ({ strapi }: { strapi: Core.Strapi }) => {
        try {
          const settings = await strapi
            .documents('api::newsletter-settings.newsletter-settings')
            .findFirst();

          const cronEnabled = settings?.cronEnabled ?? true;

          if (!cronEnabled) {
            strapi.log.debug('[Newsletter CRON] Cron is disabled in settings, skipping');
            return;
          }

          strapi.log.info('[Newsletter CRON] Running scheduled newsletter check...');

          const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
          await newsletterService.sendNewsletter({
            trigger: 'cron' as const,
            applyEligibilityFilters: true,
            markPostsAsSent: true,
          });
        } catch (error: any) {
          strapi.log.error(`[Newsletter CRON] Failed: ${error.message}`);
        }
      },
      options: {
        rule: '*/30 * * * *',
      },
    },
  });

  strapi.log.info('[Newsletter] Plugin bootstrapped, cron registered (*/30 * * * *)');
};

export default bootstrap;

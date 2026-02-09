import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('mp-sync-helper')
      .service('service')
      .getWelcomeMessage();
  },

  async syncAll(ctx) {
    try {
      const syncService = strapi.plugin('mp-sync-helper').service('service');
      const results = await syncService.syncAllPeople();
      ctx.body = { success: true, results };
    } catch (error: any) {
      strapi.log.error('Sync all failed', { error });
      ctx.throw(500, 'Sync failed', { error: error.message });
    }
  },

  async quickSync(ctx) {
    const months = parseInt(ctx.query.months as string) || 12;
    try {
      const syncService = strapi.plugin('mp-sync-helper').service('service');
      const results = await syncService.syncAllPeople(months);
      ctx.body = { success: true, months, results };
    } catch (error: any) {
      strapi.log.error('Quick sync failed', { error });
      ctx.throw(500, 'Quick sync failed', { error: error.message });
    }
  },
});

export default controller;

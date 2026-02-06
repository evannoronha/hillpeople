import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async send(ctx) {
    try {
      const { slugs } = ctx.request.body || {};
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');

      await newsletterService.sendNewsletter({
        trigger: 'manual' as const,
        slugs,
        applyEligibilityFilters: !slugs,
        markPostsAsSent: true,
      });

      ctx.body = { success: true };
    } catch (error: any) {
      strapi.log.error('Manual newsletter send failed', { error });
      ctx.throw(500, 'Newsletter send failed', { error: error.message });
    }
  },

  async testSend(ctx) {
    try {
      const { email, slugs } = ctx.request.body || {};

      if (!email) {
        ctx.throw(400, 'Email address is required');
      }

      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');

      await newsletterService.sendNewsletter({
        trigger: 'test' as const,
        slugs,
        toOverride: email,
        applyEligibilityFilters: !slugs,
        markPostsAsSent: false,
      });

      ctx.body = { success: true };
    } catch (error: any) {
      strapi.log.error('Test newsletter send failed', { error });
      ctx.throw(500, 'Test send failed', { error: error.message });
    }
  },

  async getSettings(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const settings = await newsletterService.getSettings();
      ctx.body = settings;
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch settings', { error: error.message });
    }
  },

  async updateSettings(ctx) {
    try {
      const data = ctx.request.body;

      // Check if settings exist
      const existing = await strapi.documents('api::newsletter-settings.newsletter-settings').findFirst();

      let settings;
      if (existing) {
        settings = await strapi.documents('api::newsletter-settings.newsletter-settings').update({
          documentId: existing.documentId,
          data,
        });
      } else {
        settings = await strapi.documents('api::newsletter-settings.newsletter-settings').create({
          data,
        });
      }

      ctx.body = settings;
    } catch (error: any) {
      ctx.throw(500, 'Failed to update settings', { error: error.message });
    }
  },

  async getHistory(ctx) {
    try {
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = parseInt(ctx.query.pageSize as string) || 20;

      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const history = await newsletterService.getSendHistory(page, pageSize);
      ctx.body = history;
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch history', { error: error.message });
    }
  },

  async getEligiblePosts(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const posts = await newsletterService.getEligiblePosts();
      ctx.body = { results: posts, total: posts.length };
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch eligible posts', { error: error.message });
    }
  },

  async getStats(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const stats = await newsletterService.getStats();
      ctx.body = stats;
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch stats', { error: error.message });
    }
  },
});

export default controller;

import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async confirm(ctx) {
    const { token } = ctx.params;

    if (!token) {
      ctx.body = { success: false, error: 'Token is required' };
      ctx.status = 400;
      return;
    }

    const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
    const result = await newsletterService.confirmSubscriber(token);

    ctx.body = result;
    ctx.status = result.success ? 200 : 400;
  },

  async unsubscribe(ctx) {
    const { token } = ctx.params;

    if (!token) {
      ctx.body = { success: false, error: 'Token is required' };
      ctx.status = 400;
      return;
    }

    const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
    const result = await newsletterService.unsubscribeUser(token);

    ctx.body = result;
    ctx.status = result.success ? 200 : 400;
  },
});

export default controller;

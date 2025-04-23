/**
 * `postAttributionMiddleware` middleware
 */

import type { Core } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info('In postAttributionMiddleware middleware.');
    if (!ctx.query.populate) {
      ctx.query.populate = ["createdBy", "updatedBy"];
    }


    await next();
  };
};

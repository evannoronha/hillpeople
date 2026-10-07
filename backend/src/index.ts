import type { Core } from '@strapi/strapi';
import sharp from 'sharp';
import { registerSeoAssistantRoutes } from './utils/seo-assistant';

// Serialize Sharp operations to prevent memory spikes when generating
// responsive image formats (thumbnail + 5 breakpoints) in parallel.
// Without this, a single large photo upload can exhaust memory on
// constrained environments like Strapi Cloud and crash the instance.
sharp.concurrency(1);

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    registerSeoAssistantRoutes(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap() {},
};

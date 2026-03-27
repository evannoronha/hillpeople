import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('[Photo Gallery] Plugin bootstrapped');
};

export default bootstrap;

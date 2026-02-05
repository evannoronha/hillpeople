/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  STRAPI_CACHE: DurableObjectNamespace;
  STRAPI_API_URL: string;
  STRAPI_API_TOKEN: string;
  REVALIDATE_SECRET: string;
  CLOUDFLARE_ZONE_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}

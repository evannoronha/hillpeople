/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

import type { CacheStore } from './CacheStore';

// Extend the Cloudflare environment with our Durable Object binding
interface CloudflareEnv {
  CACHE_STORE: DurableObjectNamespace<CacheStore>;
  ASSETS: Fetcher;
  STRAPI_API_URL: string;
}

// Extend Astro's App.Locals to include the Cloudflare runtime
declare namespace App {
  interface Locals {
    runtime: {
      env: CloudflareEnv;
      ctx: ExecutionContext;
      cf: IncomingRequestCfProperties;
    };
  }
}

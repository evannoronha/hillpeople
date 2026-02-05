/**
 * Custom Cloudflare Worker entry point.
 *
 * Exports the Durable Object class alongside the Astro SSR handler,
 * enabling unified caching across all Worker isolates.
 */

import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { StrapiCache } from './durable-objects/StrapiCache';

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  return {
    default: {
      // @ts-expect-error - Type mismatch between Astro's Request and Cloudflare's Request
      async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
        return handle(manifest, app, request, env, ctx);
      },
    },
    StrapiCache,
  };
}

// Also export at module level for backwards compatibility
export { StrapiCache };

import { defineMiddleware } from 'astro:middleware';
import { bustAllCaches } from './lib/cache';

export const onRequest = defineMiddleware(async ({ url }, next) => {
  // Check for ?bustcache query param
  if (url.searchParams.has('bustcache')) {
    console.log('Cache bust requested via ?bustcache');

    // Bust all caches
    const result = await bustAllCaches();

    if (result.error) {
      console.warn('Partial cache bust:', result.error);
    }

    // Redirect to the same URL without the bustcache param
    const cleanUrl = new URL(url);
    cleanUrl.searchParams.delete('bustcache');

    return Response.redirect(cleanUrl.toString(), 302);
  }

  return next();
});

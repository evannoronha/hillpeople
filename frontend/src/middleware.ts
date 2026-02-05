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

    // Use 302 redirect with noindex header to prevent indexing
    return new Response(null, {
      status: 302,
      headers: {
        'Location': cleanUrl.toString(),
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  return next();
});

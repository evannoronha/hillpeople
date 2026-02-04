/**
 * Utility to trigger cache invalidation on the frontend
 */
export async function invalidateCache(model: string, entry?: { slug?: string }) {
  const revalidateUrl = process.env.FRONTEND_REVALIDATE_URL;
  const revalidateSecret = process.env.REVALIDATE_SECRET;

  if (!revalidateUrl || !revalidateSecret) {
    strapi.log.warn('Cache invalidation not configured (missing FRONTEND_REVALIDATE_URL or REVALIDATE_SECRET)');
    return;
  }

  try {
    const response = await fetch(revalidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${revalidateSecret}`,
      },
      body: JSON.stringify({ model, entry }),
    });

    if (!response.ok) {
      const text = await response.text();
      strapi.log.error(`Cache invalidation failed: ${response.status} - ${text}`);
    } else {
      const data = await response.json() as { purged?: string[] };
      strapi.log.info(`Cache invalidated for ${model}:`, data.purged);
    }
  } catch (error) {
    strapi.log.error('Cache invalidation error:', error);
  }
}

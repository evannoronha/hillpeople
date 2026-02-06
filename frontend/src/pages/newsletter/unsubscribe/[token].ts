import type { APIRoute } from 'astro';
import { getSecret, STRAPI_API_URL } from 'astro:env/server';

export const GET: APIRoute = async ({ params, redirect }) => {
  const token = params.token;

  if (!token) {
    return redirect('/newsletter/error?message=' + encodeURIComponent('Missing unsubscribe token'), 302);
  }

  try {
    const apiToken = getSecret('STRAPI_API_TOKEN');
    const headers: HeadersInit = {};
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    const response = await fetch(`${STRAPI_API_URL}/api/newsletter/unsubscribe/${token}`, {
      headers,
    });

    const data = await response.json();

    if (data.success) {
      return redirect('/newsletter/unsubscribed', 302);
    }

    return redirect('/newsletter/error?message=' + encodeURIComponent(data.error || 'Invalid token'), 302);
  } catch (error) {
    console.error('Unsubscribe proxy error:', error);
    return redirect('/newsletter/error?message=' + encodeURIComponent('Something went wrong'), 302);
  }
};

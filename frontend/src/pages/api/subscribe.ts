import type { APIRoute } from 'astro';
import { getSecret, STRAPI_API_URL } from 'astro:env/server';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const email = body.email;

        if (!email || typeof email !== 'string') {
            return new Response(JSON.stringify({ error: { message: 'Email is required' } }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const token = getSecret('STRAPI_API_TOKEN');
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${STRAPI_API_URL}/api/subscribers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: { email } }),
        });

        if (response.ok) {
            // Don't leak Strapi response data (contains confirmation token)
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            // Only return sanitized error message
            const data = await response.json();
            const errorMessage = data?.error?.message || 'Subscription failed';
            const isAlreadySubscribed = errorMessage.includes('unique') || errorMessage.includes('already');
            return new Response(JSON.stringify({
                error: { message: isAlreadySubscribed ? 'This email is already subscribed.' : 'Subscription failed. Please try again.' }
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        console.error('Error subscribing:', error);
        return new Response(JSON.stringify({ error: { message: 'Something went wrong. Please try again.' } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

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

        const data = await response.json();

        if (response.ok) {
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify(data), {
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

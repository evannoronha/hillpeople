import type { APIRoute } from 'astro';
import { fetchPhotoAlbums } from '../../lib/api';

export const GET: APIRoute = async ({ locals }) => {
    const albums = await fetchPhotoAlbums(locals);

    return new Response(JSON.stringify({ data: albums }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
    });
};

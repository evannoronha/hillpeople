import type { APIRoute } from 'astro';
import { fetchPostsPaginated } from '../../lib/api';
import { getLargestImage, getMediaUrl } from '../../lib/imageUrl';

export const GET: APIRoute = async ({ url }) => {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '6', 10);

    const { posts, pagination } = await fetchPostsPaginated(page, pageSize);

    // Transform posts to include computed image URLs
    const transformedPosts = posts.map((post: any) => {
        const largestImage = getLargestImage(post);
        return {
            title: post.title,
            slug: post.slug,
            publishedDate: post.publishedDate,
            imageUrl: largestImage ? getMediaUrl(largestImage.url) : null,
        };
    });

    return new Response(JSON.stringify({
        posts: transformedPosts,
        pagination,
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

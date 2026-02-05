import type { APIRoute } from 'astro';
import { fetchPostsPaginated } from '../../lib/api';
import { getMediaUrl } from '../../lib/imageUrl';
import { calculateReadingTime } from '../../lib/readingTime';

export const GET: APIRoute = async ({ url, locals }) => {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '6', 10);

  const { posts, pagination } = await fetchPostsPaginated(page, pageSize, locals);

  // Transform posts to include computed values
  const transformedPosts = posts.map((post: any) => {
    const coverImage = post.coverImage;
    const formats = coverImage?.formats || {};

    // Build srcset from available formats
    const formatOrder = ['thumbnail', 'small', 'medium', 'large', 'xlarge'] as const;
    const srcsetParts: string[] = [];

    for (const formatName of formatOrder) {
      const format = formats[formatName];
      if (format?.url && format?.width) {
        srcsetParts.push(`${getMediaUrl(format.url)} ${format.width}w`);
      }
    }

    // Add original as largest option
    if (coverImage?.url && coverImage?.width) {
      srcsetParts.push(`${getMediaUrl(coverImage.url)} ${coverImage.width}w`);
    }

    return {
      title: post.title,
      slug: post.slug,
      publishedDate: post.publishedDate,
      excerpt: post.seo?.excerpt || null,
      readingTime: post.richContent ? calculateReadingTime(post.richContent) : null,
      image: coverImage
        ? {
            url: getMediaUrl(coverImage.url),
            srcset: srcsetParts.length > 0 ? srcsetParts.join(', ') : null,
            width: coverImage.width,
            height: coverImage.height,
            alt: coverImage.alternativeText || post.title,
          }
        : null,
    };
  });

  return new Response(
    JSON.stringify({
      posts: transformedPosts,
      pagination,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
};

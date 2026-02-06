import { STRAPI_API_URL } from 'astro:env/server'

const STRAPI_URL = STRAPI_API_URL
const STRAPI_MEDIA_HOST = 'competent-victory-0bdd9770d0.media.strapiapp.com';

/**
 * Converts a Strapi media URL to a proxied URL for better caching.
 * Routes images through /img/* which adds long cache headers.
 */
export const getMediaUrl = (url?: string): string => {
    if (!url) return '';

    // Check if it's a Strapi Cloud media URL - proxy it for better caching
    if (url.includes(STRAPI_MEDIA_HOST)) {
        const path = url.split(STRAPI_MEDIA_HOST)[1];
        return `/img${path}`;
    }

    // Check if it's already an absolute URL (other hosts)
    if (url.startsWith('http')) {
        return url;
    }

    // Relative URL - use Strapi API URL
    const baseUrl = STRAPI_URL;
    return `${baseUrl}${url}`;
};

/**
 * Transforms relative /uploads/ URLs in HTML content to proxied URLs.
 * This is needed for CKEditor richContent which embeds relative URLs.
 * Also handles absolute Strapi Cloud URLs and fixes video MIME types.
 */
export const transformContentUrls = (html: string): string => {
    if (!html) return '';

    return html
        // Replace relative /uploads/ URLs with proxied URLs
        .replace(/src="\/uploads\//g, `src="/img/uploads/`)
        .replace(/srcset="([^"]+)"/g, (match, srcset) => {
            const transformed = srcset.replace(/\/uploads\//g, `/img/uploads/`);
            return `srcset="${transformed}"`;
        })
        // Replace absolute Strapi Cloud media URLs with proxied URLs
        .replace(new RegExp(`https://${STRAPI_MEDIA_HOST}/`, 'g'), '/img/')
        // Fix video MIME type: video/quicktime -> video/mp4 for browser compatibility
        // MOV files are often MP4 containers and play fine with the correct MIME type
        .replace(/type="video\/quicktime"/g, 'type="video/mp4"');
};

/**
 * Returns an object-position CSS value from Strapi focal point fields.
 * Returns undefined when no focal point is set (falls back to CSS default `center`).
 */
export function getFocalPointStyle(image: { focalX?: number; focalY?: number }): string | undefined {
    if (image.focalX == null || image.focalY == null) return undefined;
    return `${image.focalX}% ${image.focalY}%`;
}

export const getLargestImage = (post: any) => {
  const { coverImage } = post;
  if (!coverImage) return null;

  const formats = coverImage.formats;
  if (!formats) return null;

  const largestFormat = Object.keys(formats).reduce((largest, key) => {
    return formats[key].size > formats[largest].size ? key : largest;
  }, Object.keys(formats)[0]);

  return formats[largestFormat];
};

/**
 * Injects ID attributes into h2/h3 headings for table of contents anchor links.
 * Skips headings that already have an ID.
 */
export const injectHeadingIds = (html: string): string => {
  if (!html) return '';

  return html.replace(
    /<(h[23])([^>]*)>([^<]+)<\/\1>/gi,
    (match, tag, attrs, text) => {
      // Skip if ID already exists
      if (attrs.includes('id="')) return match;

      // Generate slug from heading text
      const id = text
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
    }
  );
};

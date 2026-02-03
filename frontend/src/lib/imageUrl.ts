import { STRAPI_API_URL } from 'astro:env/server'

const STRAPI_URL = STRAPI_API_URL

export const getMediaUrl = (url?: string): string => {
    if (!url) return '';

    // Check if it's already an absolute URL
    if (url.startsWith('http')) {
        return url;
    }

    const baseUrl = STRAPI_URL;
    return `${baseUrl}${url}`;
};

/**
 * Transforms relative /uploads/ URLs in HTML content to absolute Strapi URLs.
 * This is needed for CKEditor richContent which embeds relative URLs.
 * Also fixes video MIME types for browser compatibility.
 */
export const transformContentUrls = (html: string): string => {
    if (!html) return '';

    return html
        // Replace relative /uploads/ URLs in src, srcset, and href attributes
        .replace(/src="\/uploads\//g, `src="${STRAPI_URL}/uploads/`)
        .replace(/srcset="([^"]+)"/g, (match, srcset) => {
            const transformed = srcset.replace(/\/uploads\//g, `${STRAPI_URL}/uploads/`);
            return `srcset="${transformed}"`;
        })
        // Fix video MIME type: video/quicktime -> video/mp4 for browser compatibility
        // MOV files are often MP4 containers and play fine with the correct MIME type
        .replace(/type="video\/quicktime"/g, 'type="video/mp4"');
};

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

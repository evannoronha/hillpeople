const STRAPI_URL = import.meta.env.STRAPI_API_URL

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
 * This is needed for CKEditor content which embeds relative URLs.
 */
export const transformContentUrls = (html: string): string => {
    if (!html) return '';

    // Replace relative /uploads/ URLs in src, srcset, and href attributes
    return html
        .replace(/src="\/uploads\//g, `src="${STRAPI_URL}/uploads/`)
        .replace(/srcset="([^"]+)"/g, (match, srcset) => {
            const transformed = srcset.replace(/\/uploads\//g, `${STRAPI_URL}/uploads/`);
            return `srcset="${transformed}"`;
        });
};

export const getLargestImage = (post:any) => {
	const { coverImage } = post;
	if (!coverImage) return null;

	const formats = coverImage.formats;
	if (!formats) return null;

	const largestFormat = Object.keys(formats).reduce((largest, key) => {
		return formats[key].size > formats[largest].size ? key : largest;
	}, Object.keys(formats)[0]);

	return formats[largestFormat]
};

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

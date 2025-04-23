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

/**
 * Gallery image URL helpers for Cloudflare R2 + Image Transformations
 *
 * Full-res images are stored in R2 and served via a custom domain
 * (photos.hillpeople.net). Cloudflare Image Transformations resize
 * on-the-fly at the edge — only originals are stored.
 */

const R2_PUBLIC_URL = 'https://photos.hillpeople.net';

export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'full';

const SIZE_WIDTHS: Record<Exclude<ImageSize, 'full'>, number> = {
  thumbnail: 400,
  medium: 1200,
  large: 2400,
};

/**
 * Build a Cloudflare Image Transformation URL for a gallery photo.
 *
 * @param r2Path - Path within the R2 bucket (e.g. "albums/yosemite/img_001.jpg")
 * @param size - Preset size or 'full' for the original
 * @param options - Additional transformation options
 */
export function galleryImageUrl(
  r2Path: string,
  size: ImageSize = 'medium',
  options?: { quality?: number; fit?: string; gravity?: string },
): string {
  if (size === 'full') {
    return `${R2_PUBLIC_URL}/${r2Path}`;
  }

  const width = SIZE_WIDTHS[size];
  const quality = options?.quality ?? 80;
  const fit = options?.fit ?? 'scale-down';
  const gravity = options?.gravity ?? '';

  const params = [
    `width=${width}`,
    `quality=${quality}`,
    `format=auto`,
    `fit=${fit}`,
    gravity ? `gravity=${gravity}` : '',
  ]
    .filter(Boolean)
    .join(',');

  return `${R2_PUBLIC_URL}/cdn-cgi/image/${params}/${r2Path}`;
}

/**
 * Build a srcset string for PhotoSwipe lightbox responsive loading.
 * Returns medium and large variants so the browser picks the best one.
 */
export function gallerySrcset(r2Path: string): string {
  const medium = galleryImageUrl(r2Path, 'medium');
  const large = galleryImageUrl(r2Path, 'large');
  return `${medium} ${SIZE_WIDTHS.medium}w, ${large} ${SIZE_WIDTHS.large}w`;
}

/**
 * Compute aspect ratio from image dimensions.
 */
export function aspectRatio(width: number, height: number): number {
  return width / height;
}

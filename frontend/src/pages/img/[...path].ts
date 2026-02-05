import type { APIRoute } from 'astro';

const STRAPI_MEDIA_HOST = 'competent-victory-0bdd9770d0.media.strapiapp.com';

// Cache for 1 year (immutable since Strapi URLs contain hashes)
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

// Max file size to attempt WebP conversion (2MB)
// Larger images may hit memory limits
const MAX_CONVERT_SIZE = 2 * 1024 * 1024;

// Image types we can convert to WebP
const CONVERTIBLE_TYPES = ['image/jpeg', 'image/png'];

// Check if we're running in Cloudflare Workers (not local dev)
const isCloudflare = typeof globalThis.caches !== 'undefined';

/**
 * Check if browser supports WebP based on Accept header
 */
function supportsWebP(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('image/webp');
}

/**
 * Convert image to WebP using Photon WASM
 * Returns null if conversion fails or isn't supported
 */
async function convertToWebP(
  imageData: ArrayBuffer,
  contentType: string
): Promise<Uint8Array | null> {
  // Skip if not running in Cloudflare (WASM doesn't work in local Node.js dev)
  if (!isCloudflare) {
    return null;
  }

  try {
    // Only convert JPEG and PNG
    if (!CONVERTIBLE_TYPES.includes(contentType)) {
      return null;
    }

    // Skip large images to avoid memory issues
    if (imageData.byteLength > MAX_CONVERT_SIZE) {
      console.log(`Skipping WebP conversion: image too large (${imageData.byteLength} bytes)`);
      return null;
    }

    // Dynamic import to avoid loading WASM in local dev
    const { PhotonImage } = await import('@cf-wasm/photon/workerd');

    const inputBytes = new Uint8Array(imageData);
    const image = PhotonImage.new_from_byteslice(inputBytes);

    // Convert to WebP with quality 80 (good balance of size/quality)
    const webpBytes = image.get_bytes_webp();

    // Free the PhotonImage to avoid memory leaks
    image.free();

    // Only use WebP if it's actually smaller
    if (webpBytes.length < imageData.byteLength) {
      const savings = Math.round((1 - webpBytes.length / imageData.byteLength) * 100);
      console.log(`WebP conversion: ${imageData.byteLength} -> ${webpBytes.length} bytes (${savings}% smaller)`);
      return webpBytes;
    }

    console.log('WebP larger than original, using original');
    return null;
  } catch (error) {
    console.error('WebP conversion failed:', error);
    return null;
  }
}

export const GET: APIRoute = async ({ params, request }) => {
  const path = params.path;

  if (!path) {
    return new Response('Not found', { status: 404 });
  }

  const strapiUrl = `https://${STRAPI_MEDIA_HOST}/${path}`;

  try {
    const response = await fetch(strapiUrl);

    if (!response.ok) {
      return new Response('Image not found', { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const imageData = await response.arrayBuffer();

    // Try WebP conversion if browser supports it
    if (supportsWebP(request) && CONVERTIBLE_TYPES.includes(contentType)) {
      const webpData = await convertToWebP(imageData, contentType);

      if (webpData) {
        return new Response(webpData, {
          status: 200,
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': CACHE_CONTROL,
            'Vary': 'Accept', // Important: cache varies by Accept header
          },
        });
      }
    }

    // Fall back to original format
    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
        'Vary': 'Accept',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Error fetching image', { status: 500 });
  }
};

/**
 * Resizes an image file in the browser before upload using Canvas API.
 *
 * Only resizes if the image exceeds MAX_DIMENSION on either side.
 * Non-image files and small images are returned unchanged.
 */

const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.85;

const RESIZABLE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Loads a File as an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Resizes an image file if it exceeds MAX_DIMENSION on either axis.
 * Returns the original file if no resize is needed or the type isn't supported.
 */
export async function resizeImageIfNeeded(file: File): Promise<File> {
  if (!RESIZABLE_TYPES.has(file.type)) {
    return file;
  }

  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;

  if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) {
    return file;
  }

  // Calculate scaled dimensions preserving aspect ratio
  const scale = MAX_DIMENSION / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, newW, newH);

  // Output as JPEG for photos (smaller than PNG), keep original type for others
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? JPEG_QUALITY : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      outputType,
      quality
    );
  });

  // Preserve original filename but adjust extension if type changed
  let name = file.name;
  if (file.type !== outputType) {
    name = name.replace(/\.[^.]+$/, '.jpg');
  }

  return new File([blob], name, { type: outputType, lastModified: file.lastModified });
}

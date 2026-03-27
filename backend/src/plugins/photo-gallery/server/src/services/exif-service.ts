import type { Core } from '@strapi/strapi';
import exifr from 'exifr';

export interface ExifData {
  width?: number;
  height?: number;
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
}

/**
 * Format shutter speed from decimal seconds to fractional notation.
 * e.g., 0.004 → "1/250", 1.5 → "1.5"
 */
function formatShutterSpeed(exposureTime: number | undefined): string | undefined {
  if (exposureTime == null) return undefined;
  if (exposureTime >= 1) return `${exposureTime}`;
  const denominator = Math.round(1 / exposureTime);
  return `1/${denominator}`;
}

/**
 * Parse JPEG dimensions from SOF (Start of Frame) markers.
 * This is more reliable than EXIF tags for getting actual image dimensions.
 */
function parseJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  // JPEG files start with 0xFF 0xD8
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) break;

    const marker = buffer[offset + 1];

    // SOF markers: 0xC0-0xCF (except 0xC4=DHT, 0xC8=JPG, 0xCC=DAC)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      // SOF structure: length(2) + precision(1) + height(2) + width(2)
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    // Skip to next marker using segment length
    const segmentLength = buffer.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }

  return null;
}

/**
 * Parse PNG dimensions from IHDR chunk.
 */
function parsePngDimensions(buffer: Buffer): { width: number; height: number } | null {
  // PNG signature: 137 80 78 71 13 10 26 10
  if (
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  )
    return null;

  // IHDR is always first chunk, at offset 8 (after signature)
  // Chunk: length(4) + type(4) + data (width(4) + height(4))
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

const exifService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Extract EXIF metadata and dimensions from an image buffer.
   */
  async extractExif(buffer: Buffer): Promise<ExifData> {
    try {
      const exif = await exifr.parse(buffer, {
        pick: [
          'Make',
          'Model',
          'LensModel',
          'LensMake',
          'FocalLength',
          'FNumber',
          'ExposureTime',
          'ISO',
          'FocalLengthIn35mmFormat',
          'ImageWidth',
          'ImageHeight',
          'ExifImageWidth',
          'ExifImageHeight',
        ],
      });

      const result: ExifData = {};

      if (exif) {
        result.cameraMake = exif.Make?.trim();
        result.cameraModel = exif.Model?.trim();

        // Prefer LensModel, fall back to LensMake
        result.lens = exif.LensModel?.trim() || exif.LensMake?.trim();

        // Prefer 35mm equivalent focal length
        const fl = exif.FocalLengthIn35mmFormat || exif.FocalLength;
        if (fl) result.focalLength = `${Math.round(fl)}mm`;

        if (exif.FNumber) result.aperture = `f/${exif.FNumber}`;
        result.shutterSpeed = formatShutterSpeed(exif.ExposureTime);
        if (exif.ISO) result.iso = `${exif.ISO}`;

        result.width = exif.ExifImageWidth || exif.ImageWidth;
        result.height = exif.ExifImageHeight || exif.ImageHeight;
      }

      // Fallback: parse dimensions directly from image headers
      if (!result.width || !result.height) {
        const dims = parseJpegDimensions(buffer) || parsePngDimensions(buffer);
        if (dims) {
          result.width = dims.width;
          result.height = dims.height;
        }
      }

      return result;
    } catch (error) {
      strapi.log.warn('[Photo Gallery] EXIF extraction failed, continuing without metadata');
      return {};
    }
  },
});

export default exifService;

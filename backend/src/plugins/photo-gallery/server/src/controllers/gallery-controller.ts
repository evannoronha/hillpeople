import type { Core } from '@strapi/strapi';
import type { ExifData } from '../services/exif-service';

interface UploadedPhoto {
  r2Path: string;
  width: number;
  height: number;
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  originalName: string;
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * POST /upload
   * Accepts multipart file uploads, extracts EXIF, uploads to R2.
   * Body: { albumSlug: string } + files
   */
  async upload(ctx) {
    try {
      const { albumSlug } = ctx.request.body || {};
      if (!albumSlug) {
        ctx.status = 400;
        ctx.body = { error: { message: 'albumSlug is required' } };
        return;
      }

      const files = ctx.request.files?.files;
      if (!files) {
        ctx.status = 400;
        ctx.body = { error: { message: 'No files provided' } };
        return;
      }

      const r2Service = strapi.plugin('photo-gallery').service('r2-service');
      const exifService = strapi.plugin('photo-gallery').service('exif-service');

      // Normalize to array (single file comes as object, multiple as array)
      const fileList = Array.isArray(files) ? files : [files];
      const results: UploadedPhoto[] = [];

      const fs = await import('fs');

      for (const file of fileList) {
        // Skip files with no content (e.g., directory entries)
        if (!file.filepath || file.size === 0) continue;

        const buffer = fs.readFileSync(file.filepath);

        // Extract EXIF metadata
        const exif: ExifData = await exifService.extractExif(buffer);

        const width = exif.width || 0;
        const height = exif.height || 0;

        // Build R2 key: albums/{slug}/{filename}
        const originalName = file.originalFilename || file.newFilename || 'unnamed.jpg';
        const sanitizedName = originalName
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '-');
        const key = `albums/${albumSlug}/${sanitizedName}`;

        // Upload to R2
        await r2Service.uploadPhoto(buffer, key, file.mimetype || 'image/jpeg');

        results.push({
          r2Path: key,
          width,
          height,
          cameraMake: exif.cameraMake,
          cameraModel: exif.cameraModel,
          lens: exif.lens,
          focalLength: exif.focalLength,
          aperture: exif.aperture,
          shutterSpeed: exif.shutterSpeed,
          iso: exif.iso,
          originalName,
        });

        // Note: Strapi's body middleware handles temp file cleanup
      }

      ctx.body = { photos: results };
    } catch (error: any) {
      strapi.log.error('[Photo Gallery] Upload failed:', error);
      ctx.status = 500;
      ctx.body = { error: { message: error.message || 'Upload failed' } };
    }
  },

  /**
   * DELETE /delete
   * Deletes a file from R2.
   * Body: { key: string }
   */
  async delete(ctx) {
    try {
      const { key } = ctx.request.body || {};
      if (!key) {
        ctx.status = 400;
        ctx.body = { error: { message: 'key is required' } };
        return;
      }

      const r2Service = strapi.plugin('photo-gallery').service('r2-service');
      await r2Service.deletePhoto(key);

      ctx.body = { success: true };
    } catch (error: any) {
      strapi.log.error('[Photo Gallery] Delete failed:', error);
      ctx.status = 500;
      ctx.body = { error: { message: error.message || 'Delete failed' } };
    }
  },

  /**
   * GET /browse?prefix=albums/my-album/
   * Lists files in R2 under a prefix.
   */
  async browse(ctx) {
    try {
      const prefix = (ctx.query.prefix as string) || 'albums/';

      const r2Service = strapi.plugin('photo-gallery').service('r2-service');
      const files = await r2Service.listPhotos(prefix);

      ctx.body = { files };
    } catch (error: any) {
      strapi.log.error('[Photo Gallery] Browse failed:', error);
      ctx.status = 500;
      ctx.body = { error: { message: error.message || 'Browse failed' } };
    }
  },

  /**
   * GET /albums
   * Lists all photo albums from Strapi for the admin dropdown.
   */
  async listAlbums(ctx) {
    try {
      const albums = await strapi.documents('api::photo-album.photo-album').findMany({
        fields: ['title', 'slug', 'date'],
        sort: 'date:desc',
      });

      ctx.body = { albums };
    } catch (error: any) {
      strapi.log.error('[Photo Gallery] List albums failed:', error);
      ctx.status = 500;
      ctx.body = { error: { message: error.message || 'List albums failed' } };
    }
  },
});

export default controller;

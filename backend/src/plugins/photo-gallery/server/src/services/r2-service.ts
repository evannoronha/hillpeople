import type { Core } from '@strapi/strapi';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const r2Service = ({ strapi }: { strapi: Core.Strapi }) => {
  let client: S3Client | null = null;

  function getClient(): S3Client {
    if (client) return client;

    const config = strapi.plugin('photo-gallery').config;
    const accountId = config('r2AccountId');
    const accessKeyId = config('r2AccessKeyId');
    const secretAccessKey = config('r2SecretAccessKey');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured');
    }

    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    return client;
  }

  function getBucket(): string {
    const bucket = strapi.plugin('photo-gallery').config('r2BucketName');
    if (!bucket) throw new Error('R2_BUCKET_NAME not configured');
    return bucket;
  }

  return {
    /**
     * Upload a file to R2.
     */
    async uploadPhoto(buffer: Buffer, key: string, contentType: string): Promise<string> {
      const s3 = getClient();
      await s3.send(
        new PutObjectCommand({
          Bucket: getBucket(),
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      strapi.log.info(`[Photo Gallery] Uploaded: ${key}`);
      return key;
    },

    /**
     * Delete a file from R2.
     */
    async deletePhoto(key: string): Promise<void> {
      const s3 = getClient();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: getBucket(),
          Key: key,
        }),
      );

      strapi.log.info(`[Photo Gallery] Deleted: ${key}`);
    },

    /**
     * List objects in R2 under a given prefix.
     */
    async listPhotos(prefix: string): Promise<{ key: string; size: number; lastModified?: Date }[]> {
      const s3 = getClient();
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: getBucket(),
          Prefix: prefix,
        }),
      );

      return (result.Contents || []).map((obj) => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified,
      }));
    },

    /**
     * Get the public URL for an R2 object.
     */
    getPublicUrl(key: string): string {
      const publicUrl = strapi.plugin('photo-gallery').config('r2PublicUrl');
      return `${publicUrl}/${key}`;
    },
  };
};

export default r2Service;

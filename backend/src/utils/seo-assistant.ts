/**
 * Admin API for AI-generated post SEO. Registered from src/index.ts.
 *
 * - POST /seo-assistant/generate              → SEO fields for the post being edited (not saved)
 * - GET  /seo-assistant/missing               → published posts with no meta description or excerpt
 * - POST /seo-assistant/backfill/:documentId  → generate, save and republish one of those posts
 *
 * The backfill only fills empty fields and skips posts with unpublished
 * edits, so publishing never pushes someone's draft changes live.
 */
import type { Core } from '@strapi/strapi';
import { generateSeo, type SeoFields } from './seo-generator';

const POST_UID = 'api::post.post';

type Seo = Partial<SeoFields> | null | undefined;

interface PostVersion {
  documentId: string;
  title: string;
  slug: string;
  richContent?: string;
  updatedAt: string;
  seo?: Seo;
}

const isMissingSeo = (seo: Seo) => !seo?.metaDescription?.trim() || !seo?.excerpt?.trim();

// A draft edited after the last publish has changes that publishing would push live.
const hasUnpublishedEdits = (draft: PostVersion | null, published: PostVersion) =>
  !!draft && new Date(draft.updatedAt).getTime() > new Date(published.updatedAt).getTime();

async function getExampleExcerpts(strapi: Core.Strapi, excludeDocumentId?: string) {
  const posts = (await strapi.documents(POST_UID).findMany({
    status: 'published',
    filters: { seo: { excerpt: { $notNull: true } } },
    sort: { publishedDate: 'desc' },
    populate: ['seo'],
    limit: 4,
  })) as unknown as PostVersion[];

  return posts
    .filter((p) => p.documentId !== excludeDocumentId)
    .map((p) => p.seo?.excerpt?.trim())
    .filter((e): e is string => !!e)
    .slice(0, 3);
}

async function getVersions(strapi: Core.Strapi, documentId: string) {
  const [draft, published] = await Promise.all(
    (['draft', 'published'] as const).map(
      (status) =>
        strapi.documents(POST_UID).findOne({
          documentId,
          status,
          populate: ['seo'],
        }) as unknown as Promise<PostVersion | null>
    )
  );
  return { draft, published };
}

function sendError(ctx: any, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  strapi.log.error(`SEO assistant: ${message}`);
  ctx.status = 500;
  ctx.body = { error: { message } };
}

export function registerSeoAssistantRoutes(strapi: Core.Strapi) {
  const canEditPosts = {
    name: 'admin::hasPermissions',
    config: { actions: [['plugin::content-manager.explorer.update', POST_UID]] },
  };

  strapi.server.routes({
    type: 'admin',
    prefix: '/seo-assistant',
    routes: [
      {
        method: 'POST',
        path: '/generate',
        handler: async (ctx: any) => {
          const { title, richContent, documentId } = ctx.request.body ?? {};
          if (!richContent || typeof richContent !== 'string') {
            ctx.status = 400;
            ctx.body = { error: { message: 'Write some post content before generating SEO' } };
            return;
          }
          try {
            ctx.body = await generateSeo({
              title: typeof title === 'string' ? title : '',
              html: richContent,
              exampleExcerpts: await getExampleExcerpts(strapi, documentId),
            });
          } catch (error) {
            sendError(ctx, error);
          }
        },
        config: { policies: [canEditPosts] },
        info: { type: 'admin' },
      },
      {
        method: 'GET',
        path: '/missing',
        handler: async (ctx: any) => {
          const published = (await strapi.documents(POST_UID).findMany({
            status: 'published',
            fields: ['title', 'slug', 'updatedAt'],
            populate: ['seo'],
            sort: { publishedDate: 'desc' },
          })) as unknown as PostVersion[];

          const missing = published.filter((p) => isMissingSeo(p.seo));
          const drafts = (await strapi.documents(POST_UID).findMany({
            status: 'draft',
            fields: ['updatedAt'],
            filters: { documentId: { $in: missing.map((p) => p.documentId) } },
          })) as unknown as PostVersion[];
          const draftById = new Map(drafts.map((d) => [d.documentId, d]));

          ctx.body = missing.map((p) => ({
            documentId: p.documentId,
            title: p.title,
            slug: p.slug,
            hasUnpublishedEdits: hasUnpublishedEdits(draftById.get(p.documentId) ?? null, p),
          }));
        },
        config: { policies: [canEditPosts] },
        info: { type: 'admin' },
      },
      {
        method: 'POST',
        path: '/backfill/:documentId',
        handler: async (ctx: any) => {
          const { documentId } = ctx.params;
          try {
            const { draft, published } = await getVersions(strapi, documentId);
            if (!published) {
              ctx.status = 404;
              ctx.body = { error: { message: 'Post is not published' } };
              return;
            }
            if (!isMissingSeo(published.seo)) {
              ctx.body = { status: 'skipped', reason: 'SEO is already filled in' };
              return;
            }
            if (hasUnpublishedEdits(draft, published)) {
              ctx.body = { status: 'skipped', reason: 'Post has unpublished edits' };
              return;
            }

            const generated = await generateSeo({
              title: published.title,
              html: published.richContent ?? '',
              exampleExcerpts: await getExampleExcerpts(strapi, documentId),
            });

            // Keep anything already written by hand; only fill the gaps.
            const existing = published.seo ?? {};
            const seo: SeoFields = {
              metaTitle: existing.metaTitle?.trim() || generated.metaTitle,
              metaDescription: existing.metaDescription?.trim() || generated.metaDescription,
              excerpt: existing.excerpt?.trim() || generated.excerpt,
            };

            // documents().update() only changes the draft, so publish to push it live.
            await strapi.documents(POST_UID).update({ documentId, data: { seo } as any });
            await strapi.documents(POST_UID).publish({ documentId });

            strapi.log.info(`SEO assistant: backfilled SEO for "${published.title}"`);
            ctx.body = { status: 'updated', seo };
          } catch (error) {
            sendError(ctx, error);
          }
        },
        config: { policies: [canEditPosts] },
        info: { type: 'admin' },
      },
    ],
  });
}

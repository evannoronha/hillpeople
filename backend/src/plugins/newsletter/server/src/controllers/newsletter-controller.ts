import type { Core } from '@strapi/strapi';
import type { Post } from '../services/newsletter-service';

/**
 * Resolve media URL: absolute URLs pass through, relative URLs get the Strapi
 * server URL prepended so images work in emails.
 */
function resolveMediaUrl(url: string | undefined, strapiUrl?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  if (strapiUrl) return `${strapiUrl.replace(/\/$/, '')}${url}`;
  return undefined;
}

function getPreviewImageUrl(post: Post, strapiUrl?: string): string | undefined {
  const img = post.coverImage;
  if (!img) return undefined;
  const preferred = img.formats?.medium ?? img.formats?.small;
  const url = preferred?.url ?? img.url;
  return resolveMediaUrl(url, strapiUrl);
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async send(ctx) {
    try {
      const { slugs } = ctx.request.body || {};
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');

      await newsletterService.sendNewsletter({
        trigger: 'manual' as const,
        slugs,
        applyEligibilityFilters: !slugs,
        markPostsAsSent: true,
      });

      ctx.body = { success: true };
    } catch (error: any) {
      strapi.log.error('Manual newsletter send failed', { error });
      ctx.status = 500;
      ctx.body = { error: { message: error.message || 'Newsletter send failed' } };
    }
  },

  async testSend(ctx) {
    try {
      const { email, slugs } = ctx.request.body || {};

      if (!email) {
        ctx.status = 400;
        ctx.body = { error: { message: 'Email address is required' } };
        return;
      }

      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');

      await newsletterService.sendNewsletter({
        trigger: 'test' as const,
        slugs,
        toOverride: email,
        applyEligibilityFilters: !slugs,
        markPostsAsSent: false,
      });

      ctx.body = { success: true };
    } catch (error: any) {
      strapi.log.error('Test newsletter send failed', { error });
      ctx.status = 500;
      ctx.body = { error: { message: error.message || 'Test send failed' } };
    }
  },

  async getSettings(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const settings = await newsletterService.getSettings();
      ctx.body = settings;
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch settings', { error: error.message });
    }
  },

  async updateSettings(ctx) {
    try {
      const data = ctx.request.body;

      // Check if settings exist
      const existing = await strapi.documents('api::newsletter-settings.newsletter-settings').findFirst();

      let settings;
      if (existing) {
        settings = await strapi.documents('api::newsletter-settings.newsletter-settings').update({
          documentId: existing.documentId,
          data,
        });
      } else {
        settings = await strapi.documents('api::newsletter-settings.newsletter-settings').create({
          data,
        });
      }

      ctx.body = settings;
    } catch (error: any) {
      ctx.throw(500, 'Failed to update settings', { error: error.message });
    }
  },

  async getHistory(ctx) {
    try {
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = parseInt(ctx.query.pageSize as string) || 20;

      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const history = await newsletterService.getSendHistory(page, pageSize);
      ctx.body = history;
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch history', { error: error.message });
    }
  },

  async getEligiblePosts(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const posts = await newsletterService.getEligiblePosts();
      ctx.body = { results: posts, total: posts.length };
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch eligible posts', { error: error.message });
    }
  },

  async getStats(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const stats = await newsletterService.getStats();
      ctx.body = stats;
    } catch (error: any) {
      ctx.throw(500, 'Failed to fetch stats', { error: error.message });
    }
  },

  async preview(ctx) {
    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      const templateService = strapi.plugin('newsletter').service('template-service');
      const settings = await newsletterService.getSettings();
      const frontendUrl = strapi.plugin('newsletter').config('frontendUrl');
      const strapiUrl: string | undefined = strapi.config.get('server.url') || undefined;
      const posts = await newsletterService.getEligiblePosts();

      if (posts.length === 0) {
        ctx.status = 400;
        ctx.body = { error: { message: 'No eligible posts to preview' } };
        return;
      }

      const html = templateService.buildNewsletterHtml(
        posts.map((p: Post) => ({
          title: p.title,
          slug: p.slug,
          publishedDate: p.publishedDate,
          coverImageUrl: getPreviewImageUrl(p, strapiUrl),
          excerpt: p.seo?.excerpt,
        })),
        `${frontendUrl}/newsletter/unsubscribe/preview`,
        frontendUrl,
        settings,
      );

      ctx.body = { html };
    } catch (error: any) {
      ctx.throw(500, 'Failed to generate preview', { error: error.message });
    }
  },
});

export default controller;

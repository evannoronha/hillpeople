import type { Core } from '@strapi/strapi';

export interface SendOptions {
  trigger: 'cron' | 'manual' | 'test';
  slugs?: string[];
  toOverride?: string;
  applyEligibilityFilters?: boolean;
  markPostsAsSent?: boolean;
}

export interface Post {
  documentId: string;
  title: string;
  slug: string;
  publishedDate: string;
  updatedAt: string;
  newsletterSent: boolean;
  coverImage?: {
    url: string;
    formats?: Record<string, { url: string; width: number }>;
  };
  seo?: {
    excerpt?: string;
  };
}

export interface Subscriber {
  documentId: string;
  email: string;
  confirmed: boolean;
  unsubscribeToken: string;
}

/**
 * Get the best image URL for email use. Prefers the 'medium' format (~750px)
 * since emails don't need full-size images. Falls back to original URL.
 * Relative URLs (from Document Service API) are resolved against strapiUrl.
 */
function getEmailImageUrl(post: Post, strapiUrl?: string): string | undefined {
  const img = post.coverImage;
  if (!img) return undefined;
  const preferred = img.formats?.medium ?? img.formats?.small;
  const url = preferred?.url ?? img.url;
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  // Document Service API returns relative paths — resolve against Strapi server URL
  if (strapiUrl) return `${strapiUrl.replace(/\/$/, '')}${url}`;
  return undefined;
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings() {
    const settings = await strapi.documents('api::newsletter-settings.newsletter-settings').findFirst();
    return settings || {};
  },

  async getEligiblePosts(): Promise<Post[]> {
    const settings = await this.getSettings();
    const cooldownMinutes = (settings as any).cooldownMinutes ?? 30;
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

    const posts = await strapi.documents('api::post.post').findMany({
      status: 'published',
      filters: {
        newsletterSent: { $ne: true },
        updatedAt: { $lt: cooldownTime },
      },
      sort: { publishedDate: 'desc' },
      populate: ['coverImage', 'seo'],
    });

    return posts as unknown as Post[];
  },

  async sendConfirmationEmail(email: string, confirmationToken: string): Promise<void> {
    const frontendUrl = strapi.plugin('newsletter').config('frontendUrl');
    const settings = await this.getSettings();

    const confirmUrl = `${frontendUrl}/newsletter/confirm/${confirmationToken}`;

    const templateService = strapi.plugin('newsletter').service('template-service');
    const html = templateService.buildConfirmationHtml(confirmUrl, settings);

    const emailService = strapi.plugin('newsletter').service('email-service');
    await emailService.sendEmail(email, 'Confirm your subscription to Hill People', html);

    strapi.log.info(`Confirmation email sent to ${email}`);
  },

  async sendReconfirmationEmail(email: string, confirmationToken: string): Promise<void> {
    const frontendUrl = strapi.plugin('newsletter').config('frontendUrl');
    const settings = await this.getSettings();

    const confirmUrl = `${frontendUrl}/newsletter/confirm/${confirmationToken}`;

    const templateService = strapi.plugin('newsletter').service('template-service');
    const html = templateService.buildReconfirmationHtml(confirmUrl, settings);

    const emailService = strapi.plugin('newsletter').service('email-service');
    await emailService.sendEmail(email, "Let's try that again — confirm your subscription", html);

    strapi.log.info(`Reconfirmation email sent to ${email}`);
  },

  async confirmSubscriber(token: string): Promise<{ success: boolean; error?: string }> {
    const subscribers = await strapi.documents('api::subscriber.subscriber').findMany({
      filters: { confirmationToken: { $eq: token } },
    });

    if (!subscribers || subscribers.length === 0) {
      return { success: false, error: 'Invalid or expired confirmation token' };
    }

    const subscriber = subscribers[0];

    // Token expired — generate a new one and resend confirmation
    if (subscriber.tokenExpiry && new Date(subscriber.tokenExpiry) < new Date()) {
      const crypto = await import('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await strapi.documents('api::subscriber.subscriber').update({
        documentId: subscriber.documentId,
        data: {
          confirmationToken: newToken,
          tokenExpiry: newExpiry,
        } as any,
      });

      await this.sendReconfirmationEmail(subscriber.email, newToken);
      strapi.log.info(`Resent confirmation email for expired token: ${subscriber.email}`);
      return { success: false, error: 'expired_resent' };
    }

    await strapi.documents('api::subscriber.subscriber').update({
      documentId: subscriber.documentId,
      data: {
        confirmed: true,
        subscribedAt: new Date().toISOString(),
        confirmationToken: null,
        tokenExpiry: null,
      } as any,
    });

    strapi.log.info(`Subscriber confirmed: ${subscriber.email}`);
    return { success: true };
  },

  async unsubscribeUser(token: string): Promise<{ success: boolean; error?: string }> {
    const subscribers = await strapi.documents('api::subscriber.subscriber').findMany({
      filters: { unsubscribeToken: { $eq: token } },
    });

    if (!subscribers || subscribers.length === 0) {
      return { success: false, error: 'Invalid unsubscribe token' };
    }

    const subscriber = subscribers[0];
    await strapi.documents('api::subscriber.subscriber').delete({
      documentId: subscriber.documentId,
    });

    strapi.log.info(`Subscriber unsubscribed: ${subscriber.email}`);
    return { success: true };
  },

  async getSendHistory(page: number = 1, pageSize: number = 20) {
    const sends = await strapi.documents('api::newsletter-send.newsletter-send').findMany({
      sort: { sentAt: 'desc' },
      limit: pageSize,
      start: (page - 1) * pageSize,
    });

    const total = await strapi.documents('api::newsletter-send.newsletter-send').count({});

    return { results: sends, pagination: { page, pageSize, total } };
  },

  async getStats() {
    const subscriberCount = await strapi.documents('api::subscriber.subscriber').count({
      filters: { confirmed: { $eq: true } },
    });

    const recentSends = await strapi.documents('api::newsletter-send.newsletter-send').findMany({
      sort: { sentAt: 'desc' },
      limit: 1,
    });

    return {
      subscriberCount,
      lastSend: recentSends.length > 0 ? recentSends[0] : null,
    };
  },

  async sendNewsletter(options: SendOptions): Promise<void> {
    const {
      trigger,
      slugs,
      toOverride,
      applyEligibilityFilters = true,
      markPostsAsSent = true,
    } = options;

    const logPrefix = trigger === 'test' ? '[TEST]' : trigger === 'manual' ? '[MANUAL]' : '[CRON]';
    strapi.log.info(`${logPrefix} Starting newsletter send...`);

    // Fetch settings
    const settings = await this.getSettings();
    const frontendUrl = strapi.plugin('newsletter').config('frontendUrl');
    const strapiUrl: string | undefined = strapi.config.get('server.url') || undefined;

    // Fetch posts
    let posts: Post[];

    if (slugs && slugs.length > 0) {
      const results = await strapi.documents('api::post.post').findMany({
        filters: { slug: { $in: slugs } },
        populate: ['coverImage', 'seo'],
      });
      posts = results as unknown as Post[];
    } else if (applyEligibilityFilters) {
      posts = await this.getEligiblePosts();
    } else {
      strapi.log.info(`${logPrefix} No post selection criteria provided`);
      return;
    }

    if (posts.length === 0) {
      strapi.log.info(`${logPrefix} No posts to send`);
      return;
    }

    strapi.log.info(`${logPrefix} Found ${posts.length} posts to send`);

    // Get subscribers
    let subscribers: Subscriber[];
    if (toOverride) {
      subscribers = [{
        documentId: '',
        email: toOverride,
        confirmed: true,
        unsubscribeToken: '',
      }];
    } else {
      const results = await strapi.documents('api::subscriber.subscriber').findMany({
        filters: { confirmed: { $eq: true } },
        limit: 1000,
      });
      subscribers = results as unknown as Subscriber[];
    }

    if (subscribers.length === 0) {
      strapi.log.info(`${logPrefix} No confirmed subscribers`);
      return;
    }

    strapi.log.info(`${logPrefix} Sending to ${subscribers.length} subscribers`);

    // Create send record
    const sendRecord = await strapi.documents('api::newsletter-send.newsletter-send').create({
      data: {
        sentAt: new Date().toISOString(),
        trigger,
        postSlugs: posts.map(p => ({ title: p.title, slug: p.slug })),
        recipientCount: subscribers.length,
        successCount: 0,
        failureCount: 0,
        status: 'sending',
      } as any,
    });

    // Send to each subscriber (with delay to respect Resend's 2 req/s rate limit)
    const emailService = strapi.plugin('newsletter').service('email-service');
    const templateService = strapi.plugin('newsletter').service('template-service');
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < subscribers.length; i++) {
      if (i > 0) await delay(600);
      const subscriber = subscribers[i];
      try {
        const unsubscribeUrl = subscriber.unsubscribeToken
          ? `${frontendUrl}/newsletter/unsubscribe/${subscriber.unsubscribeToken}`
          : `${frontendUrl}/newsletter/unsubscribe`;

        const html = templateService.buildNewsletterHtml(
          posts.map(p => ({
            title: p.title,
            slug: p.slug,
            publishedDate: p.publishedDate,
            coverImageUrl: getEmailImageUrl(p, strapiUrl),
            excerpt: p.seo?.excerpt,
          })),
          unsubscribeUrl,
          frontendUrl,
          settings,
        );

        const subject = `New from Hill People: ${posts.length} new post${posts.length > 1 ? 's' : ''}`;
        await emailService.sendEmail(subscriber.email, subject, html);

        successCount++;
        strapi.log.info(`${logPrefix} Sent to ${subscriber.email}`);
      } catch (error: any) {
        failureCount++;
        errors.push({ email: subscriber.email, error: error.message });
        strapi.log.error(`${logPrefix} Failed to send to ${subscriber.email}: ${error.message}`);
      }
    }

    // Update send record
    const status = failureCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'partial';
    await strapi.documents('api::newsletter-send.newsletter-send').update({
      documentId: sendRecord.documentId,
      data: {
        successCount,
        failureCount,
        status,
        errorDetails: errors.length > 0 ? errors : null,
      } as any,
    });

    // Only mark posts as sent if at least one email succeeded
    if (markPostsAsSent && successCount > 0) {
      for (const post of posts) {
        try {
          // update() only modifies the draft — must publish() to propagate to the published version
          await strapi.documents('api::post.post').update({
            documentId: post.documentId,
            data: { newsletterSent: true } as any,
          });
          await strapi.documents('api::post.post').publish({
            documentId: post.documentId,
          });
          strapi.log.info(`${logPrefix} Marked post ${post.slug} as sent`);
        } catch (error: any) {
          strapi.log.error(`${logPrefix} Failed to mark post ${post.slug} as sent: ${error.message}`);
        }
      }
    }

    strapi.log.info(`${logPrefix} Newsletter send complete: ${successCount} success, ${failureCount} failures`);

    // Throw if all sends failed so the controller can report the error
    if (successCount === 0 && failureCount > 0) {
      throw new Error(`All sends failed: ${errors[0]?.error || 'Unknown error'}`);
    }
  },
});

export default service;

import type { Core } from '@strapi/strapi';

export interface NewsletterSettings {
  headingText: string;
  headingColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  footerText: string;
}

export interface PostInfo {
  title: string;
  slug: string;
  publishedDate: string;
}

const DEFAULTS: NewsletterSettings = {
  headingText: 'New from Hill People',
  headingColor: '#643f41',
  linkColor: '#f16e53',
  buttonColor: '#627f7c',
  buttonTextColor: '#f4f2ec',
  footerText: 'You received this because you subscribed to Hill People newsletter.',
};

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  buildNewsletterHtml(
    posts: PostInfo[],
    unsubscribeUrl: string,
    frontendUrl: string,
    settings: Partial<NewsletterSettings> = {}
  ): string {
    const s = { ...DEFAULTS, ...settings };

    const postsHtml = posts.map(post => `
    <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
      <h2 style="margin: 0 0 10px 0;">
        <a href="${frontendUrl}/blog/${post.slug}" style="color: ${s.linkColor}; text-decoration: none;">
          ${post.title}
        </a>
      </h2>
      <p style="color: #666; font-size: 14px; margin: 0;">
        ${new Date(post.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  `).join('');

    return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; padding: 20px;">
      <h1 style="color: ${s.headingColor}; margin-bottom: 30px;">${s.headingText}</h1>
      ${postsHtml}
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
      <p style="font-size: 12px; color: #999;">
        ${s.footerText}
        <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
      </p>
    </div>
    `;
  },

  buildConfirmationHtml(
    confirmUrl: string,
    settings: Partial<NewsletterSettings> = {}
  ): string {
    const s = { ...DEFAULTS, ...settings };

    return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; padding: 20px;">
      <h1 style="color: ${s.headingColor};">Welcome to Hill People!</h1>
      <p>Thanks for subscribing to our newsletter. Please confirm your subscription by clicking the link below:</p>
      <p style="margin: 30px 0;">
        <a href="${confirmUrl}" style="background-color: ${s.buttonColor}; color: ${s.buttonTextColor}; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Confirm Subscription
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    `;
  },
});

export default service;

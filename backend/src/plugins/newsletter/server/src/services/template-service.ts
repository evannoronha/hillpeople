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
  coverImageUrl?: string;
  excerpt?: string;
}

const DEFAULTS: NewsletterSettings = {
  headingText: 'New from Hill People',
  headingColor: '#643f41',
  linkColor: '#f16e53',
  buttonColor: '#627f7c',
  buttonTextColor: '#f4f2ec',
  footerText: 'You received this because you subscribed to Hill People newsletter.',
};

// Site brand colors
const BRAND = {
  bg: '#f4f2ec',
  cardBg: '#ffffff',
  text: '#643f41',
  textMuted: '#8a7071',
  heading: '#f16e53',
  teal: '#627f7c',
  tealText: '#f4f2ec',
  border: '#e5e0d8',
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  buildNewsletterHtml(
    posts: PostInfo[],
    unsubscribeUrl: string,
    frontendUrl: string,
    settings: Partial<NewsletterSettings> = {}
  ): string {
    const s = { ...DEFAULTS, ...settings };

    const postsHtml = posts.map((post, i) => {
      const postUrl = `${frontendUrl}/blog/${post.slug}`;
      const imageHtml = post.coverImageUrl
        ? `<a href="${postUrl}" style="text-decoration: none;">
            <img src="${post.coverImageUrl}" alt="${post.title}" width="560" style="width: 100%; height: auto; display: block; border-radius: 6px 6px 0 0;" />
          </a>`
        : '';
      const excerptHtml = post.excerpt
        ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${BRAND.text};">${post.excerpt}</p>`
        : '';
      const topPadding = post.coverImageUrl ? '20px' : '0';

      return `
      <!--[if mso]><table width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <div style="max-width: 560px; margin: 0 auto ${i < posts.length - 1 ? '24px' : '0'} auto; background: ${BRAND.cardBg}; border-radius: 6px; overflow: hidden; border: 1px solid ${BRAND.border};">
        ${imageHtml}
        <div style="padding: ${topPadding} 28px 24px 28px;">
          <h2 style="margin: 0 0 8px 0; font-size: 22px; line-height: 1.3;">
            <a href="${postUrl}" style="color: ${s.linkColor}; text-decoration: none; font-family: 'Libre Baskerville', Georgia, serif;">${post.title}</a>
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: ${BRAND.textMuted}; font-family: -apple-system, sans-serif;">${formatDate(post.publishedDate)}</p>
          ${excerptHtml}
          <a href="${postUrl}" style="display: inline-block; background-color: ${s.buttonColor}; color: ${s.buttonTextColor}; padding: 10px 22px; text-decoration: none; border-radius: 4px; font-size: 14px; font-family: -apple-system, sans-serif; font-weight: 600;">Read</a>
        </div>
      </div>
      <!--[if mso]></td></tr></table><![endif]-->`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${s.headingText}</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bg}; font-family: 'Libre Baskerville', Georgia, serif; color: ${BRAND.text}; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; padding-bottom: 32px;">
      <a href="${frontendUrl}" style="text-decoration: none;">
        <h1 style="margin: 0 0 4px 0; font-size: 32px; color: ${BRAND.heading}; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700;">Hill People</h1>
      </a>
      <p style="margin: 0; font-size: 14px; color: ${BRAND.textMuted}; font-family: -apple-system, sans-serif;">${s.headingText}</p>
    </div>

    <!-- Posts -->
    ${postsHtml}

    <!-- Footer -->
    <div style="padding-top: 32px; text-align: center; border-top: 1px solid ${BRAND.border}; margin-top: 32px;">
      <p style="font-size: 12px; color: ${BRAND.textMuted}; line-height: 1.6; font-family: -apple-system, sans-serif; margin: 0 0 8px 0;">${s.footerText}</p>
      <a href="${unsubscribeUrl}" style="font-size: 12px; color: ${BRAND.textMuted}; font-family: -apple-system, sans-serif;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`;
  },

  buildConfirmationHtml(
    confirmUrl: string,
    settings: Partial<NewsletterSettings> = {}
  ): string {
    const s = { ...DEFAULTS, ...settings };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Confirm your subscription</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bg}; font-family: 'Libre Baskerville', Georgia, serif; color: ${BRAND.text}; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; padding-bottom: 32px;">
      <h1 style="margin: 0; font-size: 32px; color: ${BRAND.heading}; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700;">Hill People</h1>
    </div>

    <!-- Card -->
    <div style="background: ${BRAND.cardBg}; border-radius: 6px; padding: 36px 32px; border: 1px solid ${BRAND.border}; text-align: center;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.text}; font-family: 'Libre Baskerville', Georgia, serif;">Welcome!</h2>
      <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.6; color: ${BRAND.text};">Thanks for subscribing. Click below to confirm your subscription and start receiving our newsletter.</p>
      <a href="${confirmUrl}" style="display: inline-block; background-color: ${s.buttonColor}; color: ${s.buttonTextColor}; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-size: 16px; font-family: -apple-system, sans-serif; font-weight: 600;">Confirm Subscription</a>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: ${BRAND.textMuted}; font-family: -apple-system, sans-serif;">This link expires in 24 hours.</p>
    </div>

    <!-- Footer -->
    <div style="padding-top: 24px; text-align: center;">
      <p style="font-size: 12px; color: ${BRAND.textMuted}; font-family: -apple-system, sans-serif; margin: 0;">If you didn't subscribe, you can safely ignore this email.</p>
    </div>

  </div>
</body>
</html>`;
  },
});

export default service;

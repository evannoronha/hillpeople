import type { Core } from '@strapi/strapi';

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async sendEmail(to: string, subject: string, html: string): Promise<string> {
    const resendApiKey = strapi.plugin('newsletter').config('resendApiKey');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Read sender info from newsletter settings
    const settings = await strapi.documents('api::newsletter-settings.newsletter-settings').findFirst();
    const senderName = settings?.senderName || 'Hill People';
    const senderEmail = settings?.senderEmail || 'web@hillpeople.net';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json() as ResendResponse;

    if (!response.ok) {
      throw new Error(`Resend API error: ${data.error?.message || response.statusText}`);
    }

    strapi.log.info(`Email sent to ${to}, id: ${data.id}`);
    return data.id!;
  },
});

export default service;

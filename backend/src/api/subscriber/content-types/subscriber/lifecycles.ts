import crypto from 'crypto';

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;

    // Generate confirmation token (32 bytes = 64 hex chars)
    data.confirmationToken = crypto.randomBytes(32).toString('hex');

    // Token expires in 24 hours
    data.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Generate unsubscribe token
    data.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  },

  async afterCreate(event: {
    result: { email: string; confirmationToken: string };
  }) {
    const { result } = event;

    try {
      const newsletterService = strapi.plugin('newsletter').service('newsletter-service');
      await newsletterService.sendConfirmationEmail(result.email, result.confirmationToken);
      strapi.log.info(`Confirmation email sent to ${result.email}`);
    } catch (error) {
      strapi.log.error('Error sending confirmation email:', error);
    }
  },
};

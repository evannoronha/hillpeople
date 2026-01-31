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
    const workerUrl = process.env.NEWSLETTER_WORKER_URL;

    if (!workerUrl) {
      strapi.log.warn('NEWSLETTER_WORKER_URL not set, skipping confirmation email');
      return;
    }

    try {
      const response = await fetch(`${workerUrl}/send-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: result.email,
          confirmationToken: result.confirmationToken,
        }),
      });

      if (!response.ok) {
        strapi.log.error(`Failed to send confirmation email: ${response.status}`);
      } else {
        strapi.log.info(`Confirmation email sent to ${result.email}`);
      }
    } catch (error) {
      strapi.log.error('Error sending confirmation email:', error);
    }
  },
};

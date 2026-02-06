export default {
  default: {
    resendApiKey: '',
    frontendUrl: '',
  },
  validator(config: { resendApiKey: string; frontendUrl: string }) {
    if (!config.resendApiKey) {
      strapi.log.warn('Newsletter plugin: RESEND_API_KEY not set, email sending will fail');
    }
    if (!config.frontendUrl) {
      strapi.log.warn('Newsletter plugin: CLIENT_URL not set, email links will be broken');
    }
  },
};

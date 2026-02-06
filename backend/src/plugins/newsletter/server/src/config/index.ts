export default {
  default: {
    resendApiKey: '',
    frontendUrl: 'https://hillpeople.net',
  },
  validator(config: { resendApiKey: string; frontendUrl: string }) {
    if (!config.resendApiKey) {
      strapi.log.warn('Newsletter plugin: RESEND_API_KEY not set, email sending will fail');
    }
  },
};

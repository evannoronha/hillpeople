export default {
  default: {
    r2AccountId: '',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2BucketName: '',
    r2PublicUrl: '',
  },
  validator(config: Record<string, string>) {
    if (!config.r2AccessKeyId || !config.r2SecretAccessKey) {
      strapi.log.warn('Photo Gallery plugin: R2 credentials not set, uploads will fail');
    }
  },
};

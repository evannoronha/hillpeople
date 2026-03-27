export default () => ({
    upload: {
        config: {
            breakpoints: {
                xlarge: 1920,
                large: 1000,
                medium: 750,
                small: 500,
                xsmall: 64
            },
        }
    },
    'mp-sync-helper': {
        enabled: true,
        resolve: './src/plugins/mp-sync-helper'
    },
    newsletter: {
        enabled: true,
        resolve: './src/plugins/newsletter',
        config: {
            resendApiKey: process.env.RESEND_API_KEY || '',
            frontendUrl: process.env.CLIENT_URL || '',
        },
    },
    'photo-gallery': {
        enabled: true,
        resolve: './src/plugins/photo-gallery',
        config: {
            r2AccountId: process.env.R2_ACCOUNT_ID || '',
            r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
            r2BucketName: process.env.R2_BUCKET_NAME || '',
            r2PublicUrl: process.env.R2_PUBLIC_URL || '',
        },
    },
});

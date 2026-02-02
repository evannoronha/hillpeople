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
    }
});

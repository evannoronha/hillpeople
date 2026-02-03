// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site:'https://hillpeople.net',

  env: {
    schema: {
      STRAPI_API_URL: envField.string({ context: 'server', access: 'public', default: 'https://journal.hillpeople.net' }),
      STRAPI_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    }
  },

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      // See: https://github.com/withastro/astro/issues/12824
      alias: import.meta.env.PROD ? {
        'react-dom/server': 'react-dom/server.edge',
      } : {},
    },
  },

  adapter: cloudflare(),
});

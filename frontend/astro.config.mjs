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
    plugins: [tailwindcss()]
  },

  adapter: cloudflare(),
});

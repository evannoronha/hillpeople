// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site:'https://hillpeople.net',

  env: {
    schema: {
      STRAPI_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    }
  },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare(),
});

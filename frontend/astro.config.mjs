// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site:'https://hillpeople.net',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare(),
  experimental: {
    session: true, // since you're using sessions
  },

});

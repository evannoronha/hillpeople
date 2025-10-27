// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site:'https://hillpeople.net',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare(),

  experimental: {
  },

  integrations: [react()],
})

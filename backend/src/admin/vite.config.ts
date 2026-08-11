import { mergeConfig, type UserConfig } from 'vite';

// Work around Strapi 5.50+ Vite optimizeDeps auto-exclude breaking CJS deps
// reachable from @_sh/strapi-plugin-ckeditor (see strapi/strapi#27062, #27136).
export default (config: UserConfig) => {
  return mergeConfig(config, {
    resolve: {
      dedupe: ['ckeditor5'],
    },
    optimizeDeps: {
      include: [
        'ckeditor5',
        'property-expr',
        'toposort',
        'fuzzysort',
        'es-toolkit/compat/isEqual',
        'extend',
        'debug',
        'sanitize-html',
      ],
    },
  });
};

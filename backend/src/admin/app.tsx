import { type PluginConfig, setPluginConfig, defaultHtmlPreset } from '@_sh/strapi-plugin-ckeditor';

const config: PluginConfig = {
  presets: [
    {
      ...defaultHtmlPreset,
      editorConfig: {
        ...defaultHtmlPreset.editorConfig,
        mediaEmbed: {
          previewsInData: true,
        },
      },
    },
  ],
};

export default {
  register() {
    setPluginConfig(config);
  },
  bootstrap() {},
};

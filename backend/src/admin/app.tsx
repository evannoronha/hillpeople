import { setPluginConfig } from '@_sh/strapi-plugin-ckeditor';

export default {
  bootstrap() {},
  register() {
    // Configure CKEditor plugin
    setPluginConfig({
      // Enable video embed previews in data output
      presets: {
        defaultHtml: {
          editor: {
            mediaEmbed: {
              previewsInData: true,
            },
          },
        },
      },
    });
  },
};

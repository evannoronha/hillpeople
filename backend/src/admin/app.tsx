import {
  type PluginConfig,
  setPluginConfig,
  defaultHtmlPreset,
  StrapiMediaLib,
  StrapiUploadAdapter,
} from '@_sh/strapi-plugin-ckeditor';

const config: PluginConfig = {
  presets: [
    {
      ...defaultHtmlPreset,
      editorConfig: {
        ...defaultHtmlPreset.editorConfig,
        // Add Strapi media library integration
        extraPlugins: [StrapiMediaLib, StrapiUploadAdapter],
        mediaEmbed: {
          previewsInData: true,
        },
        // Add media library button to toolbar
        toolbar: [
          'heading',
          '|',
          'bold',
          'italic',
          'link',
          'bulletedList',
          'numberedList',
          '|',
          'strapiMediaLib',
          'insertTable',
          'blockQuote',
          '|',
          'undo',
          'redo',
        ],
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

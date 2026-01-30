import {
  type PluginConfig,
  setPluginConfig,
  defaultHtmlPreset,
  StrapiMediaLib,
  StrapiUploadAdapter,
} from '@_sh/strapi-plugin-ckeditor';
import { Plugin } from 'ckeditor5';

/**
 * Plugin to fix video playback in CKEditor.
 * 1. Fixes MIME types (video/quicktime -> video/mp4) for browser compatibility
 * 2. Enables pointer events on video elements so controls are clickable
 */
class VideoFixer extends Plugin {
  static get pluginName() {
    return 'VideoFixer';
  }

  init() {
    const editor = this.editor;

    // Inject CSS to make video controls clickable inside CKEditor widgets
    this.injectStyles();

    // Fix MIME types in the editing view when content changes
    editor.editing.view.document.on('change', () => {
      this.fixVideoMimeTypes();
    });

    // Also fix on initial load
    editor.on('ready', () => {
      this.fixVideoMimeTypes();
    });
  }

  injectStyles() {
    const styleId = 'ckeditor-video-fixer-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Allow clicks to pass through to video controls */
      .ck-editor .html-object-embed video,
      .ck-editor .html-object-embed audio {
        pointer-events: auto !important;
      }
      /* Make the widget wrapper not block clicks on the video */
      .ck-editor .html-object-embed.ck-widget {
        cursor: default;
      }
      .ck-editor .html-object-embed.ck-widget.ck-widget_selected {
        outline: 2px solid var(--ck-color-focus-border);
      }
    `;
    document.head.appendChild(style);
  }

  fixVideoMimeTypes() {
    const editor = this.editor;
    const view = editor.editing.view;
    const domRoot = view.getDomRoot();

    if (!domRoot) return;

    // Find all source elements with video/quicktime type
    const sources = domRoot.querySelectorAll('source[type="video/quicktime"]');
    sources.forEach((source: Element) => {
      source.setAttribute('type', 'video/mp4');
      // Reload the video element to pick up the new type
      const video = source.closest('video');
      if (video) {
        (video as HTMLVideoElement).load();
      }
    });
  }
}

const config: PluginConfig = {
  presets: [
    {
      ...defaultHtmlPreset,
      editorConfig: {
        ...defaultHtmlPreset.editorConfig,
        // Add Strapi media library integration and video MIME type fixer
        extraPlugins: [StrapiMediaLib, StrapiUploadAdapter, VideoFixer],
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

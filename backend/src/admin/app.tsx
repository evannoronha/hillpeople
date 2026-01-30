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

    // Fix videos on initial load
    editor.on('ready', () => {
      this.fixVideos();
      this.observeNewVideos();
    });
  }

  /**
   * Watch for new video elements being added to the editor
   */
  observeNewVideos() {
    const editor = this.editor;
    const view = editor.editing.view;
    const domRoot = view.getDomRoot();

    if (!domRoot) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Check if the added node is or contains a video
              const videos = node.matches('video')
                ? [node]
                : Array.from(node.querySelectorAll('video'));
              if (videos.length > 0) {
                this.fixVideos();
              }
            }
          });
        }
      }
    });

    observer.observe(domRoot, {
      childList: true,
      subtree: true,
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
        outline: none !important;
      }
      /* Hide the "HTML object" label */
      .ck-editor .html-object-embed.ck-widget::before {
        display: none !important;
      }
      /* Clean selection state - subtle border instead of dashed outline */
      .ck-editor .html-object-embed.ck-widget.ck-widget_selected {
        outline: 2px solid var(--ck-color-focus-border) !important;
        border-radius: 4px;
      }

      /* ========================================
         Match Strapi native Blocks Editor exactly
         ======================================== */

      /* Use system font stack like native editor */
      .ck.ck-editor {
        font-family: -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif !important;
      }

      /* Toolbar container */
      .ck.ck-toolbar {
        background: rgb(246, 246, 249) !important;
        padding: 8px !important;
        border: none !important;
        border-radius: 0 !important;
        gap: 4px !important;
      }

      /* Keep separators but make them act as spacing */
      .ck.ck-toolbar .ck-toolbar__separator {
        margin: 0 4px !important;
        background: transparent !important;
        width: 0 !important;
      }

      /* Base button/dropdown styles */
      .ck.ck-toolbar .ck-button,
      .ck.ck-toolbar .ck-dropdown > .ck-button {
        border: 1px solid rgb(220, 220, 228) !important;
        border-radius: 0 !important;
        background: rgb(255, 255, 255) !important;
        padding: 7px !important;
        min-height: 32px !important;
        min-width: 32px !important;
        height: 32px !important;
        color: rgb(142, 142, 169) !important;
        margin: 0 !important;
        font-family: inherit !important;
      }

      .ck.ck-toolbar .ck-button:hover,
      .ck.ck-toolbar .ck-dropdown > .ck-button:hover {
        background: rgb(246, 246, 249) !important;
        color: rgb(75, 75, 115) !important;
      }

      .ck.ck-toolbar .ck-button.ck-on,
      .ck.ck-toolbar .ck-dropdown > .ck-button.ck-on {
        background: rgb(233, 233, 239) !important;
        color: rgb(75, 75, 115) !important;
      }

      /* === Button grouping with shared borders === */

      /* First item after separator (or first item) - left radius */
      .ck.ck-toolbar__items > .ck-toolbar__separator + .ck-button,
      .ck.ck-toolbar__items > .ck-toolbar__separator + .ck-dropdown > .ck-button,
      .ck.ck-toolbar__items > .ck-dropdown:first-child > .ck-button {
        border-radius: 4px 0 0 4px !important;
      }

      /* Middle items - no radius, no left border */
      .ck.ck-toolbar__items > .ck-button + .ck-button,
      .ck.ck-toolbar__items > .ck-button + .ck-dropdown > .ck-button,
      .ck.ck-toolbar__items > .ck-dropdown + .ck-button,
      .ck.ck-toolbar__items > .ck-dropdown + .ck-dropdown > .ck-button {
        border-left: none !important;
        border-radius: 0 !important;
      }

      /* Last item before separator - right radius */
      .ck.ck-toolbar__items > .ck-button:has(+ .ck-toolbar__separator),
      .ck.ck-toolbar__items > .ck-dropdown:has(+ .ck-toolbar__separator) > .ck-button {
        border-radius: 0 4px 4px 0 !important;
      }

      /* Last item in toolbar (no following separator) - right radius */
      .ck.ck-toolbar__items > .ck-button:last-child,
      .ck.ck-toolbar__items > .ck-dropdown:last-child > .ck-button {
        border-radius: 0 4px 4px 0 !important;
      }

      /* Single button after separator and before separator - full radius */
      .ck.ck-toolbar__items > .ck-toolbar__separator + .ck-button:has(+ .ck-toolbar__separator),
      .ck.ck-toolbar__items > .ck-toolbar__separator + .ck-dropdown:has(+ .ck-toolbar__separator) > .ck-button {
        border-radius: 4px !important;
      }

      /* Icon sizing to match native 16x16 */
      .ck.ck-toolbar .ck-button .ck-icon,
      .ck.ck-toolbar .ck-button svg {
        width: 16px !important;
        height: 16px !important;
        color: inherit !important;
      }

      /* Heading dropdown styling to match native */
      .ck.ck-toolbar .ck-heading-dropdown .ck-dropdown__button {
        min-width: 123px !important;
        width: auto !important;
        padding: 4px 12px 4px 16px !important;
        height: 32px !important;
        border-radius: 4px !important;
        gap: 8px !important;
      }

      .ck.ck-toolbar .ck-heading-dropdown .ck-dropdown__button .ck-button__label {
        font-size: 14px !important;
        font-weight: 500 !important;
      }

      /* List dropdowns - hide the arrow to match native simple buttons */
      .ck.ck-toolbar .ck-list-styles-dropdown .ck-splitbutton__arrow {
        display: none !important;
      }

      .ck.ck-toolbar .ck-list-styles-dropdown .ck-splitbutton__action {
        border-radius: inherit !important;
      }

      /* Editor content area */
      .ck.ck-editor__editable {
        padding: 16px !important;
        min-height: 200px !important;
        border-radius: 0 !important;
        font-family: inherit !important;
        font-size: 14px !important;
      }

      /* Hide word count to match native editor */
      .ck-word-count {
        display: none !important;
      }

      /* ========================================
         Dark mode styles
         ======================================== */
      @media (prefers-color-scheme: dark) {
        .ck.ck-toolbar {
          background: rgb(24, 24, 38) !important;
        }

        .ck.ck-toolbar .ck-button,
        .ck.ck-toolbar .ck-dropdown > .ck-button {
          border-color: rgb(74, 74, 106) !important;
          background: rgb(33, 33, 52) !important;
          color: rgb(192, 192, 207) !important;
        }

        .ck.ck-toolbar .ck-button:hover,
        .ck.ck-toolbar .ck-dropdown > .ck-button:hover {
          background: rgb(45, 45, 65) !important;
          color: rgb(220, 220, 230) !important;
        }

        .ck.ck-toolbar .ck-button.ck-on,
        .ck.ck-toolbar .ck-dropdown > .ck-button.ck-on {
          background: rgb(74, 74, 106) !important;
          color: rgb(220, 220, 230) !important;
        }

        .ck.ck-editor__editable {
          background: rgb(33, 33, 52) !important;
          color: #FFFFFF !important;
          font-size: 14px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  fixVideos() {
    const editor = this.editor;
    const view = editor.editing.view;
    const domRoot = view.getDomRoot();

    if (!domRoot) return;

    // Find all videos and fix MIME types + ensure they preload
    const videos = domRoot.querySelectorAll('video');
    videos.forEach((video: Element) => {
      const videoEl = video as HTMLVideoElement;
      let needsReload = false;

      // Fix quicktime MIME type
      const source = videoEl.querySelector('source[type="video/quicktime"]');
      if (source) {
        source.setAttribute('type', 'video/mp4');
        needsReload = true;
      }

      // Ensure preload is set so the preview frame loads automatically
      if (videoEl.getAttribute('preload') !== 'metadata') {
        videoEl.setAttribute('preload', 'metadata');
        needsReload = true;
      }

      if (needsReload) {
        videoEl.load();
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
        // Toolbar matching native Strapi Blocks Editor layout:
        // Headings | B I U S | Lists | Code Image Link Quote
        toolbar: [
          'heading',
          '|',
          'bold',
          'italic',
          'underline',
          'strikethrough',
          '|',
          'alignment',
          '|',
          'bulletedList',
          'numberedList',
          '|',
          'code',
          'strapiMediaLib',
          'link',
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

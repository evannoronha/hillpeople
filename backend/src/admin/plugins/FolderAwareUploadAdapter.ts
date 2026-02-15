/**
 * CKEditor plugin that uploads files to Strapi with automatic folder organization.
 *
 * Files are uploaded to folders based on the article being edited:
 * - Posts: /post/{slug}
 * - About page: /about
 *
 * This replaces the default StrapiUploadAdapter to add folder support.
 */

import { Plugin, FileRepository } from 'ckeditor5';
import { getArticleContext, getFolderPath } from '../utils/articleContext';
import { ensureFolderPath } from '../utils/folderManager';
import { resizeImageIfNeeded } from '../utils/resizeImage';

interface UploadConfig {
  uploadUrl: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

interface FileLoader {
  file: Promise<File>;
  uploadTotal: number;
  uploaded: number;
}

interface UploadResponse {
  name: string;
  url: string;
  alternativeText?: string;
  formats?: Record<string, { width: number; url: string }>;
}

/**
 * Gets the backend URL prefix for file URLs
 */
function prefixFileUrlWithBackendUrl(url: string): string {
  // In Strapi admin, we're already on the backend, so relative URLs work
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return `/${url}`;
}

/**
 * Check if an image has responsive formats
 */
function isImageResponsive(formats: Record<string, { width: number }>): boolean {
  return Object.keys(formats).length > 0;
}

/**
 * The actual upload adapter that handles file uploads with folder support
 */
class FolderAwareAdapter {
  private loader: FileLoader;
  private config: UploadConfig;
  private xhr: XMLHttpRequest | null = null;

  constructor(loader: FileLoader, config: UploadConfig) {
    this.loader = loader;
    this.config = config;
  }

  /**
   * Starts the upload process — resizes large images client-side first
   */
  upload(): Promise<{ alt?: string; urls?: Record<string | number, string> }> {
    return this.loader.file
      .then((file) => resizeImageIfNeeded(file))
      .then((file) => {
        return this.getFolderId().then((folderId) => {
          return new Promise<{ alt?: string; urls?: Record<string | number, string> }>((resolve, reject) => {
            this.initRequest();
            this.initListeners(resolve, reject, file);
            this.sendRequest(file, folderId);
          });
        });
      });
  }

  /**
   * Gets the folder ID for the current article context
   */
  private getFolderId(): Promise<number | null> {
    const context = getArticleContext();

    if (!context) {
      return Promise.resolve(null);
    }

    const folderPath = getFolderPath(context);

    return ensureFolderPath(folderPath).catch(() => null);
  }

  /**
   * Aborts the upload process
   */
  abort(): void {
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  /**
   * Initializes the XMLHttpRequest
   */
  private initRequest(): void {
    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
    xhr.open('POST', this.config.uploadUrl, true);
    xhr.responseType = 'json';
  }

  /**
   * Initializes XMLHttpRequest listeners
   */
  private initListeners(
    resolve: (value: { alt?: string; urls?: Record<string | number, string> }) => void,
    reject: (reason?: string) => void,
    file: File
  ): void {
    const xhr = this.xhr!;
    const { loader } = this;
    const genericErrorText = `Couldn't upload file: ${file.name}.`;

    xhr.addEventListener('error', () => reject(genericErrorText));
    xhr.addEventListener('abort', () => reject());
    xhr.addEventListener('load', () => {
      const response = xhr.response as UploadResponse[] | { error?: { message?: string } };

      if (!Array.isArray(response) || response.length !== 1) {
        const errorMessage =
          response && 'error' in response && response.error?.message
            ? response.error.message
            : genericErrorText;
        return reject(errorMessage);
      }

      const { name, url, alternativeText, formats } = response[0];
      const urls: Record<string | number, string> = { default: prefixFileUrlWithBackendUrl(url) };
      const alt = alternativeText || name;

      if (formats && isImageResponsive(formats)) {
        const sortedFormatsKeys = Object.keys(formats).sort(
          (a, b) => formats[a].width - formats[b].width
        );
        sortedFormatsKeys.forEach((k) => {
          urls[formats[k].width] = prefixFileUrlWithBackendUrl(formats[k].url);
        });
      }

      resolve(url ? { alt, urls } : {});
    });

    if (xhr.upload) {
      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          loader.uploadTotal = evt.total;
          loader.uploaded = evt.loaded;
        }
      });
    }
  }

  /**
   * Prepares the data and sends the request
   */
  private sendRequest(file: File, folderId: number | null): void {
    const xhr = this.xhr!;
    const headers = this.config.headers || {};
    const withCredentials = this.config.withCredentials || false;

    Object.keys(headers).forEach((headerName) => {
      xhr.setRequestHeader(headerName, headers[headerName]);
    });
    xhr.withCredentials = withCredentials;

    const data = new FormData();
    data.append('files', file);

    // Add folder information if we have a target folder
    if (folderId !== null) {
      data.append('fileInfo', JSON.stringify({ folder: folderId }));
    }

    xhr.send(data);
  }
}

/**
 * CKEditor plugin that registers the folder-aware upload adapter.
 *
 * Named "StrapiUploadAdapter" so the CKEditor plugin's setup code
 * finds it and calls initAdapter() with the config.
 */
export class FolderAwareUploadAdapter extends Plugin {
  static get requires() {
    return [FileRepository] as const;
  }

  static get pluginName() {
    // Use the same name as the original so the setup code finds us
    return 'StrapiUploadAdapter' as const;
  }

  init(): void {
    // Empty - initAdapter will be called by the CKEditor plugin's setup code
  }

  /**
   * Called by the CKEditor plugin's Field component setup code
   */
  initAdapter(config: UploadConfig): void {
    if (!config.uploadUrl) {
      return;
    }

    // Register our custom adapter factory with the FileRepository
    const fileRepository = this.editor.plugins.get(FileRepository);
    fileRepository.createUploadAdapter = (loader) => {
      return new FolderAwareAdapter(loader as FileLoader, config);
    };
  }
}

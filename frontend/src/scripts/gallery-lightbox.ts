import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipeDynamicCaption from 'photoswipe-dynamic-caption-plugin';
import 'photoswipe/style.css';
import 'photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css';

function initGalleryLightbox() {
  const galleryEl = document.querySelector('#gallery');
  if (!galleryEl) return;

  const lightbox = new PhotoSwipeLightbox({
    gallery: '#gallery',
    children: 'a',

    // Responsive srcset — PhotoSwipe recalculates sizes on zoom
    pswpModule: () => import('photoswipe'),

    // Image padding (pixels from viewport edges)
    paddingFn: () => ({
      top: 40,
      bottom: 40,
      left: 20,
      right: 20,
    }),

    // Zoom levels
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 4,

    // UI behavior
    bgOpacity: 0.92,
    loop: true,
    wheelToZoom: true,
    closeOnVerticalDrag: true,
    pinchToClose: true,
  });

  // Auto-detect dimensions when data-pswp-width/height are missing.
  // This reads the thumbnail img's naturalWidth/Height which the browser
  // already knows once the grid images have loaded.
  lightbox.addFilter('itemData', (itemData: any, _index: number) => {
    if (!itemData.width || !itemData.height) {
      const thumbImg = itemData.element?.querySelector('img');
      if (thumbImg && thumbImg.naturalWidth && thumbImg.naturalHeight) {
        itemData.width = thumbImg.naturalWidth;
        itemData.height = thumbImg.naturalHeight;
      } else {
        // Fallback: use a reasonable default that PhotoSwipe can work with.
        // PhotoSwipe will resize once the full image loads via contentLoad.
        itemData.width = 1200;
        itemData.height = 800;
      }
    }
    return itemData;
  });

  // Once the full-size image loads in the lightbox, update to its real dimensions
  lightbox.on('contentLoad', (e: any) => {
    const { content } = e;
    if (content.type === 'image') {
      const img = content.element;
      if (img) {
        const onLoad = () => {
          if (img.naturalWidth && img.naturalHeight) {
            content.width = img.naturalWidth;
            content.height = img.naturalHeight;
            content.slide?.updateContentSize?.(true);
          }
        };
        if (img.complete) {
          onLoad();
        } else {
          img.addEventListener('load', onLoad, { once: true });
        }
      }
    }
  });

  // Dynamic caption plugin
  new PhotoSwipeDynamicCaption(lightbox, {
    type: 'auto',
    captionContent: (slide: any) => {
      const el = slide.data.element?.querySelector('.pswp-caption-content');
      if (!el) return '';

      const captionText = el.querySelector('.caption-text')?.textContent || '';
      const exifText = el.querySelector('.caption-exif')?.textContent || '';

      const parts: string[] = [];
      if (captionText) {
        parts.push(`<div class="pswp-caption-text">${captionText}</div>`);
      }
      if (exifText) {
        parts.push(`<div class="pswp-caption-exif">${exifText}</div>`);
      }

      return parts.join('');
    },
    mobileCaptionOverlapRatio: 0.3,
    mobileLayoutBreakpoint: 600,
  });

  lightbox.init();
}

// Initialize on page load
initGalleryLightbox();

// Re-initialize for Astro view transitions
document.addEventListener('astro:page-load', initGalleryLightbox);

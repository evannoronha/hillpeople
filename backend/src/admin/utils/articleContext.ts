/**
 * Utility to detect article context (type and slug) from the Strapi admin URL
 */

export interface ArticleContext {
  type: 'post' | 'about';
  slug: string | null;
}

/**
 * Parses the current URL and DOM to determine the article being edited.
 *
 * URL patterns:
 * - Posts: /admin/content-manager/collection-types/api::post.post/{documentId}
 * - About: /admin/content-manager/single-types/api::about.about
 *
 * For posts, the slug is read from the slug input field in the DOM.
 */
export function getArticleContext(): ArticleContext | null {
  const pathname = window.location.pathname;

  // Check for post editing
  const postMatch = pathname.match(/api::post\.post\/([^/]+)/);
  if (postMatch) {
    // Try to get slug from the DOM input field
    const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement | null;
    const slug = slugInput?.value || null;

    return {
      type: 'post',
      slug,
    };
  }

  // Check for about page editing
  const aboutMatch = pathname.match(/api::about\.about/);
  if (aboutMatch) {
    return {
      type: 'about',
      slug: null,
    };
  }

  return null;
}

/**
 * Builds the folder path for the current article context.
 *
 * Examples:
 * - Post with slug "dublin" → ["post", "dublin"]
 * - About page → ["about"]
 * - Post without slug yet → ["post", "unsorted"]
 */
export function getFolderPath(context: ArticleContext): string[] {
  if (context.type === 'about') {
    return ['about'];
  }

  // For posts, use slug or fall back to "unsorted"
  const slug = context.slug || 'unsorted';
  return ['post', slug];
}

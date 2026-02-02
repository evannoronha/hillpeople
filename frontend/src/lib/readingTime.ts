/**
 * Calculate estimated reading time from HTML content.
 * Uses average reading speed of 200 words per minute.
 */
export function calculateReadingTime(htmlContent: string): number {
  // Strip HTML tags
  const text = htmlContent.replace(/<[^>]*>/g, '');

  // Count words (split on whitespace, filter empty)
  const words = text.trim().split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;

  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  // Return at least 1 minute
  return Math.max(1, minutes);
}

/**
 * Fallback meta description for posts without SEO fields: the first
 * paragraph of the post, shortened to fit search-result snippets.
 */

const MAX_LENGTH = 160;

// Skip short paragraphs like photo credits or a lone "Day 1".
const MIN_PARAGRAPH_LENGTH = 40;

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&rdquo;|&ldquo;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

export function descriptionFromHtml(html: string | null | undefined): string {
  if (!html) return '';

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => htmlToText(m[1]));
  const text =
    paragraphs.find((p) => p.length >= MIN_PARAGRAPH_LENGTH) ||
    paragraphs.find(Boolean) ||
    htmlToText(html);

  return truncate(text, MAX_LENGTH);
}

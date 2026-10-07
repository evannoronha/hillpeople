/**
 * Generates SEO metadata (meta title, meta description, excerpt) for a blog
 * post using the Claude API. Used by the "Generate SEO" panel in the post
 * editor and by the backfill for existing posts.
 */
import Anthropic from '@anthropic-ai/sdk';

export const SEO_LIMITS = {
  metaTitle: 60,
  metaDescription: 160,
  excerpt: 300,
} as const;

export type SeoFields = { [K in keyof typeof SEO_LIMITS]: string };

const MODEL = 'claude-opus-5-5';

// Long posts don't need to be sent in full to summarize them well.
const MAX_CONTENT_CHARS = 20000;

const SYSTEM_PROMPT = `You write SEO metadata for Hill People, a personal blog about climbing, trail running, travel and life outdoors, written in the first person by its authors.

Given a post, return:
- metaTitle: the title shown in search results, at most ${SEO_LIMITS.metaTitle} characters. Usually the post title, shortened only if it is too long.
- metaDescription: a one-sentence summary for search results, at most ${SEO_LIMITS.metaDescription} characters.
- excerpt: one or two sentences shown under the post title on the home page and in the newsletter email, at most ${SEO_LIMITS.excerpt} characters. It should make a reader want to open the post.

Write in the blog's own voice: plain, warm and specific. Match the style of the example excerpts when they are given. Use details from the post rather than generic phrases, and don't invent facts that aren't in the post. No hashtags, no emoji, no clickbait.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    metaTitle: { type: 'string' },
    metaDescription: { type: 'string' },
    excerpt: { type: 'string' },
  },
  required: ['metaTitle', 'metaDescription', 'excerpt'],
  additionalProperties: false,
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  client ??= new Anthropic();
  return client;
}

/**
 * Converts the CKEditor HTML of a post into plain text.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|figcaption)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Shortens text to at most `max` characters, cutting at a word boundary.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

function overLimit(fields: SeoFields): string[] {
  return (Object.keys(SEO_LIMITS) as (keyof SeoFields)[])
    .filter((key) => fields[key].length > SEO_LIMITS[key])
    .map((key) => `${key} is ${fields[key].length} characters (limit ${SEO_LIMITS[key]})`);
}

async function requestFields(messages: Anthropic.Beta.BetaMessageParam[]) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages,
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to generate SEO for this post');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Claude ran out of output tokens while generating SEO');
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  const parsed = JSON.parse(text) as SeoFields;
  return { response, fields: parsed };
}

/**
 * Generates SEO fields for a post. `exampleExcerpts` are hand-written excerpts
 * from other posts, used to match the blog's tone.
 */
export async function generateSeo(input: {
  title: string;
  html: string;
  exampleExcerpts?: string[];
}): Promise<SeoFields> {
  const content = htmlToText(input.html).slice(0, MAX_CONTENT_CHARS);
  if (!content) {
    throw new Error('The post has no content to summarize yet');
  }

  const examples = (input.exampleExcerpts ?? []).filter(Boolean);
  const examplesBlock = examples.length
    ? `<example_excerpts>\n${examples.map((e) => `<excerpt>${e}</excerpt>`).join('\n')}\n</example_excerpts>\n\n`
    : '';

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: 'user',
      content: `${examplesBlock}<post>\n<title>${input.title}</title>\n<content>\n${content}\n</content>\n</post>`,
    },
  ];

  let { response, fields } = await requestFields(messages);

  // Structured outputs can't enforce string lengths, so ask once more if any
  // field is too long, then fall back to truncating.
  const problems = overLimit(fields);
  if (problems.length) {
    messages.push(
      { role: 'assistant', content: response.content as Anthropic.Beta.BetaContentBlockParam[] },
      { role: 'user', content: `Some fields are too long: ${problems.join('; ')}. Shorten them to fit.` },
    );
    ({ fields } = await requestFields(messages));
  }

  return {
    metaTitle: truncate(fields.metaTitle.trim(), SEO_LIMITS.metaTitle),
    metaDescription: truncate(fields.metaDescription.trim(), SEO_LIMITS.metaDescription),
    excerpt: truncate(fields.excerpt.trim(), SEO_LIMITS.excerpt),
  };
}

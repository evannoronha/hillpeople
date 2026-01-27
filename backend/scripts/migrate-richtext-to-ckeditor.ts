/**
 * Migration script: Convert markdown `content` to HTML `richContent`
 *
 * Reads each post and the about page from the Strapi REST API,
 * converts the markdown `content` field to HTML using `marked`,
 * and writes the result to the `richContent` field.
 *
 * The original `content` field is NEVER modified.
 *
 * Usage:
 *   npx tsx scripts/migrate-richtext-to-ckeditor.ts              # write mode
 *   npx tsx scripts/migrate-richtext-to-ckeditor.ts --dry-run     # preview only
 *
 * Environment variables:
 *   STRAPI_URL    - Strapi base URL (default: http://localhost:1337)
 *   STRAPI_TOKEN  - API token with full access to posts and about
 */

import { marked } from "marked";

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!STRAPI_TOKEN) {
  console.error(
    "Error: STRAPI_TOKEN environment variable is required.\n" +
      "Create a full-access API token in the Strapi admin under\n" +
      "Settings > API Tokens, then export it:\n" +
      "  export STRAPI_TOKEN=your_token_here"
  );
  process.exit(1);
}

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${STRAPI_TOKEN}`,
};

async function fetchAllPosts(): Promise<any[]> {
  const posts: any[] = [];
  let page = 1;
  const pageSize = 25;

  while (true) {
    const url = `${STRAPI_URL}/api/posts?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&status=draft`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch posts (page ${page}): ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data = json.data || [];
    posts.push(...data);

    const pagination = json.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) break;
    page++;
  }

  return posts;
}

async function fetchAbout(): Promise<any | null> {
  const url = `${STRAPI_URL}/api/about?populate=*`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch about: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || null;
}

async function updatePost(documentId: string, richContent: string): Promise<void> {
  const url = `${STRAPI_URL}/api/posts/${documentId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ data: { richContent } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update post ${documentId}: ${res.status} ${body}`);
  }
}

async function updateAbout(documentId: string, richContent: string): Promise<void> {
  const url = `${STRAPI_URL}/api/about`;
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ data: { richContent } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update about ${documentId}: ${res.status} ${body}`);
  }
}

async function convertMarkdownToHtml(markdown: string): Promise<string> {
  // marked passes through raw HTML (iframes, video tags) unchanged
  return await marked(markdown);
}

async function main() {
  console.log(`Migration mode: ${DRY_RUN ? "DRY RUN (no writes)" : "WRITE"}`);
  console.log(`Strapi URL: ${STRAPI_URL}\n`);

  // Migrate posts
  const posts = await fetchAllPosts();
  console.log(`Found ${posts.length} post(s) to migrate.\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const post of posts) {
    const { documentId, title, content, richContent } = post;

    if (!content) {
      console.log(`[SKIP] "${title}" — no markdown content`);
      skippedCount++;
      continue;
    }

    if (richContent) {
      console.log(`[SKIP] "${title}" — richContent already populated`);
      skippedCount++;
      continue;
    }

    const html = await convertMarkdownToHtml(content);

    if (DRY_RUN) {
      console.log(`[DRY RUN] "${title}" (${documentId}):`);
      console.log(`  Markdown length: ${content.length} chars`);
      console.log(`  HTML length: ${html.length} chars`);
      console.log(`  HTML preview: ${html.substring(0, 200)}...`);
      console.log();
    } else {
      await updatePost(documentId, html);
      console.log(`[MIGRATED] "${title}" (${documentId})`);
    }
    migratedCount++;
  }

  // Migrate about page
  const about = await fetchAbout();
  if (about) {
    const { documentId, content, richContent } = about;

    if (!content) {
      console.log(`[SKIP] About page — no markdown content`);
      skippedCount++;
    } else if (richContent) {
      console.log(`[SKIP] About page — richContent already populated`);
      skippedCount++;
    } else {
      const html = await convertMarkdownToHtml(content);

      if (DRY_RUN) {
        console.log(`[DRY RUN] About page (${documentId}):`);
        console.log(`  Markdown length: ${content.length} chars`);
        console.log(`  HTML length: ${html.length} chars`);
        console.log(`  HTML preview: ${html.substring(0, 200)}...`);
        console.log();
      } else {
        await updateAbout(documentId, html);
        console.log(`[MIGRATED] About page (${documentId})`);
      }
      migratedCount++;
    }
  } else {
    console.log(`[SKIP] No about page found`);
  }

  console.log(`\nDone! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  if (DRY_RUN) {
    console.log("(Dry run — no data was written. Run without --dry-run to apply changes.)");
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

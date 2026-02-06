# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hill People is a blog platform with an Astro frontend (https://hillpeople.net) and Strapi CMS backend (https://journal.hillpeople.net). The frontend fetches data via SSR, and Strapi renders the frontend in an iframe for preview mode.

## Development Commands

### Quick Start (from repo root)
```bash
make dev                   # Frontend against local Strapi (localhost:1337)
make dev-prod              # Frontend against production Strapi
make backend               # Run local Strapi backend
make sync-data             # Pull production data to local Strapi
make upgrade-strapi        # Upgrade Strapi to latest version
```

### Frontend (from `frontend/` directory)
```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build for production
npm run deploy     # Build and deploy to Cloudflare
```

### Backend (from `backend/` directory)
```bash
npm run develop    # Start Strapi with autoReload
npm run build      # Build admin panel
npm run transfer   # Fetch data from production (requires STRAPI_PRODUCTION_URL and STRAPI_TRANSFER_TOKEN in .env)
npm run upgrade    # Upgrade Strapi to latest version
```

## Architecture

### Data Flow
1. Frontend fetches posts from Strapi API (`/api/posts?populate=*`)
2. Post content is stored as HTML in Strapi using CKEditor (`richContent` field)
3. Images are served with responsive formats (xlarge, large, medium, small, xsmall)

### Frontend (`frontend/src/`)
- **`lib/api.ts`** - Strapi API client: `fetchPosts()`, `fetchPostBySlug()`, `fetchSingleType()` — all accept optional `locals` param for DO caching
- **`lib/do-cache.ts`** - Durable Object cache helpers: `getCached()`, `setCached()`, `clearDOCache()`
- **`lib/cache.ts`** - Cache invalidation: Cloudflare edge purge + DO cache clear
- **`lib/imageUrl.ts`** - Utilities for constructing Strapi image URLs and selecting formats
- **`durable-objects/StrapiCache.ts`** - Durable Object class for unified cross-isolate caching
- **`worker.ts`** - Custom Worker entry point that exports DO alongside Astro SSR handler
- **`pages/blog/[slug].astro`** - Dynamic post pages; supports `?status=draft` for preview mode

### Backend (`backend/src/api/`)
- **`post/`** - Blog post collection type with custom attribution middleware
- **`about/`** - Single type for the about page
- **`post/middlewares/postAttributionMiddleware.ts`** - Auto-populates `createdBy`/`updatedBy` fields

### Preview Mode
Strapi admin generates preview URLs like `/blog/{slug}?status=draft`. The frontend checks for `status=draft` query param to fetch and render draft content.

## Git Workflow

- Always develop on a new branch checked out from latest `main`
- All changes require human review and testing before merge
- PRs are merged via the GitHub UI (not via CLI)
- Never push directly to `main`

## Adding New Pages

When adding a new page to the frontend:
1. Add the URL to `.github/workflows/lighthouse.yml` in the `url` array (Lighthouse CI)
2. Add the URL to `frontend/src/pages/sitemap.xml.ts`

## Caching Strategy

The frontend uses a two-layer caching strategy to minimize Strapi API calls while ensuring content freshness.

### Layer 1: Durable Object Cache

A Cloudflare Durable Object (`StrapiCache`) provides a single shared cache instance across all Worker isolates. Located in `frontend/src/durable-objects/StrapiCache.ts`.

- **TTL**: 1 hour
- **Scope**: Global — shared across all Worker isolates (unlike per-isolate caching)
- **Storage**: SQLite-backed with in-memory read-through cache (persists across DO evictions)
- **Skips caching**: 404s and empty responses
- **Invalidation**: Automatic on TTL expiry, or manual via `?bustcache` query param on any page
- **Access**: All data-fetching functions accept `Astro.locals` to access the DO binding

### Layer 2: Cloudflare Edge Cache

HTTP `Cache-Control` headers enable Cloudflare's edge caching for rendered pages.

| Page | Cache-Control |
|------|---------------|
| `/blog/[slug]` | `public, s-maxage=3600, stale-while-revalidate=86400` |
| `/blog/[slug]?status=draft` | `private, no-store` |
| `/api/posts` | `public, s-maxage=300, stale-while-revalidate=600` |
| `/api/climbing-ticks` | `public, s-maxage=300, stale-while-revalidate=600` |

### Cache Invalidation

**Manual**: Append `?bustcache` to any URL (e.g., `https://hillpeople.net/climbing?bustcache`) to clear both caches:
1. Clears the Durable Object cache (affects all isolates instantly)
2. Purges Cloudflare edge cache via API (requires `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN`)
3. Redirects back to the clean URL

**Automatic**: Strapi lifecycle hooks call `/api/revalidate` when content changes, purging specific URLs:

| Content Type | URLs Purged |
|--------------|-------------|
| `post` | `/`, `/api/posts`, `/blog/{slug}` |
| `about` | `/about` |
| `home-page` | `/` |
| `site-settings` | `/`, `/about`, `/climbing`, `/privacy` |
| `climbing-tick` | `/climbing`, `/api/ticklist-data` |
| `climbing-goal` | `/climbing`, `/api/ticklist-data` |
| `person` | `/climbing`, `/api/ticklist-data` |
| `privacy-policy` | `/privacy` |

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `CLOUDFLARE_ZONE_ID` | Cloudflare Pages | Zone ID for cache purge API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages | Token with "Zone.Cache Purge" permission |
| `REVALIDATE_SECRET` | Both | Shared secret for webhook auth |
| `FRONTEND_REVALIDATE_URL` | Strapi Cloud | `https://hillpeople.net/api/revalidate` |

## Adding New Frontend Pages

When adding a new page to the frontend:

1. **Lighthouse CI**: Add the URL to `.github/workflows/lighthouse.yml` in the `url` array
2. **Cache invalidation**: Add the URL to `ALL_CACHEABLE_URLS` in `frontend/src/lib/cache.ts`
3. **Cache-Control headers**: If the page should be cached at the edge, add appropriate `Cache-Control` headers

## Adding New Strapi Content Types

When adding a new content type in Strapi that affects frontend pages:

1. **Lifecycle hooks**: Create `backend/src/api/{content-type}/content-types/{content-type}/lifecycles.ts`:
   ```typescript
   import { invalidateCache } from '../../../../utils/cache-invalidation';

   export default {
     async afterCreate() { await invalidateCache('{content-type}'); },
     async afterUpdate() { await invalidateCache('{content-type}'); },
     async afterDelete() { await invalidateCache('{content-type}'); },
   };
   ```

2. **URL mapping**: Add the content type to `CONTENT_TYPE_URLS` in `frontend/src/lib/cache.ts`:
   ```typescript
   '{content-type}': ['/affected-page', '/api/affected-endpoint'],
   ```

## Newsletter

The newsletter system is a Strapi plugin at `backend/src/plugins/newsletter/`. It sends emails via Resend when new posts are published.

### How it works
- **Cron job** checks for eligible posts (published, `newsletterSent=false`, past cooldown period) on a configurable interval
- **Admin UI** at Newsletter in the Strapi sidebar: Send tab (manual send, test send, email preview), History tab, Settings tab
- **Confirm/unsubscribe** endpoints are proxied through the Astro frontend (`/newsletter/confirm/[token]`, `/newsletter/unsubscribe/[token]`) to keep Strapi unexposed
- **Subscriber lifecycle** in `backend/src/api/subscriber/` sends confirmation emails via the plugin service on new signups

### Plugin structure
- `server/src/services/email-service.ts` — Resend API wrapper
- `server/src/services/template-service.ts` — HTML email generation (branded, with dark mode)
- `server/src/services/newsletter-service.ts` — Core orchestration (send, confirm, unsubscribe)
- `server/src/controllers/` — Admin routes + content-api routes
- `server/src/bootstrap.ts` — Cron registration
- `admin/src/` — React admin UI

### Plugin development
After modifying plugin source files, rebuild and restart Strapi:
```bash
cd backend/src/plugins/newsletter && npm run build
# Then restart Strapi (Ctrl+C and re-run `make backend`)
```

### Key gotchas (Strapi 5)
- `documents().update()` only modifies the draft — call `publish()` after to propagate to the published version
- Document Service API returns **relative** media URLs (e.g., `/uploads/img.jpg`), unlike the REST API which resolves them to absolute. Use `strapi.config.get('server.url')` to resolve.
- Query published documents with `status: 'published'` param, not a filter

### Environment variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Strapi Cloud | Resend API key for sending emails |
| `CLIENT_URL` | Strapi Cloud | Frontend URL (shared with admin preview config) |
| `STRAPI_PUBLIC_URL` | Strapi Cloud | Strapi public URL for resolving media URLs in emails |

## Deployment

Both services auto-deploy on merge to main:
- Frontend: Cloudflare Pages
- Backend: Strapi Cloud

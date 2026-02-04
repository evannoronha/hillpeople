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
- **`lib/api.ts`** - Strapi API client: `fetchPosts()`, `fetchPostBySlug()`, `fetchSingleType()`
- **`lib/imageUrl.ts`** - Utilities for constructing Strapi image URLs and selecting formats
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

### Layer 1: Isolate Cache (in-memory)

Located in `frontend/src/lib/api.ts`, the `responseCache` Map caches Strapi API responses within a Cloudflare Worker isolate.

- **TTL**: 1 hour
- **Scope**: Per-isolate (different users may hit different isolates)
- **Skips caching**: 404s and empty responses
- **Invalidation**: Automatic on TTL expiry, or manual via `/api/cachebust`

### Layer 2: Cloudflare Edge Cache

HTTP `Cache-Control` headers enable Cloudflare's edge caching for rendered pages.

| Page | Cache-Control |
|------|---------------|
| `/blog/[slug]` | `public, s-maxage=3600, stale-while-revalidate=86400` |
| `/blog/[slug]?status=draft` | `private, no-store` |
| `/api/posts` | `public, s-maxage=300, stale-while-revalidate=600` |
| `/api/climbing-ticks` | `public, s-maxage=300, stale-while-revalidate=600` |

### Cache Invalidation

**Manual**: Visit `/api/cachebust` to clear both caches:
1. Clears the isolate's in-memory `responseCache`
2. Purges Cloudflare edge cache via API (requires `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN`)

**Automatic** (future): Strapi lifecycle hooks can call `/api/revalidate` to purge specific URLs when content changes.

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `CLOUDFLARE_ZONE_ID` | Cloudflare Pages | Zone ID for cache purge API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages | Token with "Zone.Cache Purge" permission |

## Deployment

Both services auto-deploy on merge to main:
- Frontend: Cloudflare Pages
- Backend: Strapi Cloud

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
2. Post content is stored as markdown in Strapi, converted to HTML using `marked` library
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

## Deployment

Both services auto-deploy on merge to main:
- Frontend: Cloudflare Pages
- Backend: Strapi Cloud

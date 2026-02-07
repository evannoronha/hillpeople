# Photo Gallery Investigation

## Goal

Add photo galleries to hillpeople.net:
- A top-level `/photos` page for browsing galleries
- Ability to attach a gallery to a blog post
- Upload full-res images, serve web-optimized versions
- Stay within free tier or significantly cheaper than pic-time ($20/month)
- Prefer Cloudflare offerings since the frontend is already on CF

## Current Image Pipeline

Images today flow through Strapi Cloud's built-in media CDN:

1. Upload via Strapi admin → stored on Strapi Cloud media CDN
2. Strapi auto-generates responsive formats (xlarge/1920, large/1000, medium/750, small/500, xsmall/64)
3. Frontend proxies images through `/img/[...path]` endpoint → immutable cache headers
4. `ResponsiveHeroImage.astro` builds `srcset` from available formats
5. A `PhotoGallery.astro` component already exists (used for climbing photos) with lightbox

This works for blog cover images and small photo sets on climbing ticks, but was not designed for large gallery collections (hundreds of full-res photos).

## Option A: Strapi Media Library (current provider)

**How it works:** Continue using Strapi Cloud's media library. Create a new "Gallery" collection type in Strapi with a `photos` media field (multiple). Organize galleries as Strapi entries.

**Pros:**
- Zero new infrastructure — already using Strapi Cloud
- Content editors manage galleries in the same admin UI
- Responsive image generation is automatic (already configured)
- Existing `PhotoGallery.astro` lightbox component is reusable
- Can relate galleries to blog posts via Strapi relations

**Cons:**
- **Storage limits are the main concern.** Strapi Cloud's developer plan includes 15 GB of asset storage. Full-res photos (10-30 MB each from a mirrorless camera) means ~500-1500 photos before hitting that limit. Overages cost $0.50/GB.
- **Bandwidth limits.** Developer plan includes 50 GB/month asset bandwidth. A gallery page loading many images could burn through this quickly. Overages are $30/100 GB.
- **Upload UX.** Strapi's media library isn't built for batch-uploading hundreds of photos in one session. It works, but it's clunky for this use case.
- **No on-the-fly resizing.** Formats are generated at upload time and are fixed. You can't request an arbitrary size for a new layout without re-uploading.
- **Strapi Cloud doesn't let you swap the upload provider** to R2 without self-hosting Strapi (they technically support third-party providers, but you'd still pay for Strapi Cloud hosting AND R2 storage).

**Cost estimate (500 photos, 15 MB avg):**
- Storage: ~7.5 GB → within 15 GB free tier
- Bandwidth: depends on traffic, but moderate gallery browsing could stay within 50 GB/month
- If you grow to 2000+ photos: ~30 GB storage → $7.50/month in overages

**Verdict:** Workable for a small gallery (<500 photos). Gets expensive and clunky at scale. Not great if you want to archive years of full-res photography.

## Option B: Cloudflare R2 + Image Transformations (recommended)

**How it works:** Store original full-res images in an R2 bucket. Use Cloudflare Image Transformations to resize on-the-fly at the edge. Manage gallery metadata in Strapi (titles, descriptions, ordering, post relations) but store only R2 keys/paths — not the actual image files.

**Architecture:**

```
Upload flow:
  Full-res photo → R2 bucket (via Workers upload endpoint or wrangler CLI)

Serving flow:
  Browser requests /photos/gallery-slug
    → Astro page fetches gallery metadata from Strapi (image keys, titles, order)
    → Renders <img> tags pointing to CF Image Transform URLs
    → e.g., /cdn-cgi/image/width=800,quality=80,format=auto/r2-public-url/photo.jpg
    → Cloudflare transforms on first request, caches at edge thereafter

Strapi data model:
  Gallery (collection type):
    - title (text)
    - slug (uid)
    - description (richtext)
    - date (date)
    - coverImageKey (text) — R2 object key
    - photos (JSON or repeatable component):
        - key (text) — R2 object key
        - caption (text)
        - order (integer)
    - post (relation → Post, optional) — attach gallery to blog post
```

**Pros:**
- **R2 free tier is generous:** 10 GB storage free, zero egress fees. At 15 MB/photo, that's ~650 photos free. Beyond that, $0.015/GB/month — 100 GB (6,600 photos) costs $1.50/month.
- **Image Transformations free tier:** 5,000 unique transformations/month free. If you serve 3 sizes per photo, that's ~1,600 unique photos/month before paying. Overages are $0.50/1,000.
- **On-the-fly resizing:** Request any dimension via URL params. No need to pre-generate formats. Serve thumbnails, medium, and full-size from the same original.
- **Format negotiation:** `format=auto` serves AVIF/WebP to supported browsers automatically.
- **No bandwidth costs:** R2 egress is free. Transformed images are cached at edge.
- **Decouples storage from CMS:** Strapi handles metadata only (lightweight), R2 handles heavy lifting. Could even swap Strapi out later without migrating photos.
- **Keeps everything on Cloudflare:** R2, Workers, Image Transforms, and the existing Pages deployment all on the same platform.

**Cons:**
- **Upload workflow needs building.** No admin UI for uploading to R2 out of the box. Options:
  1. A simple Workers-based upload API (with auth) that the Strapi admin or a custom page calls
  2. Use `wrangler r2 object put` from CLI for batch uploads
  3. Build a small upload UI as a Strapi custom field plugin or standalone page
- **Gallery metadata management.** Strapi stores image keys as text/JSON rather than using its native media library. Less visual — you won't see thumbnails in the Strapi admin unless you build a custom field.
- **Image Transformations require a paid Images subscription** ($5/month) if you exceed the free 5,000 unique transformations OR want to use the Worker binding API. The free tier only covers the URL-based transform approach.
- **Two systems to manage.** Photos live in R2, metadata lives in Strapi. Need to keep them in sync (orphan cleanup, etc.).

**Cost estimate (2,000 photos, 15 MB avg):**
- R2 storage: 30 GB × $0.015 = $0.45/month (first 10 GB free)
- R2 operations: well within free tier for a personal blog
- Image transforms: ~6,000 unique transforms (3 sizes × 2,000) → 1,000 over free tier → $0.50/month
- **Total: ~$1/month** (vs $20/month for pic-time)

**Cost estimate (10,000 photos):**
- R2 storage: 150 GB × $0.015 = $2.25/month
- Image transforms: ~30,000 unique → $12.50/month
- **Total: ~$15/month** — still cheaper than pic-time, for 10x the photos

## Option C: Cloudflare Images (Paid Storage)

**How it works:** Upload images directly to Cloudflare Images (their managed image hosting product). Images handles storage, variants, and delivery.

**Pricing:**
- $5 per 100,000 images stored (prepaid)
- $1 per 100,000 images delivered

**Verdict:** More expensive than R2 for storage-heavy use cases. The delivery fee adds up. R2 + Transformations is strictly cheaper for a photography use case. Cloudflare Images is designed more for SaaS apps with user-uploaded content than for personal photo archives.

## Option D: External Gallery Service (e.g., keep pic-time, or use Flickr/SmugMug)

Embed or link to an external service. Cheapest in development effort, but doesn't integrate with the blog and you're paying $20/month already for pic-time.

## Recommendation

**Option B (R2 + Image Transformations)** is the best fit:

1. **Cost:** Under $1/month for a reasonable photo collection, scaling linearly
2. **Performance:** Edge-cached transformed images, AVIF/WebP auto-negotiation, zero egress
3. **Architecture:** Clean separation — Strapi for metadata/relations, R2 for storage
4. **Integration:** Same Cloudflare platform as the existing frontend, can reuse the Worker
5. **Flexibility:** On-the-fly resizing means you can change layouts without regenerating images

### Suggested Implementation Plan

**Phase 1: Infrastructure**
- Create an R2 bucket (e.g., `hillpeople-photos`)
- Set up public access via custom domain (e.g., `photos-cdn.hillpeople.net`)
- Verify Image Transformations work with the R2 origin
- Build a simple upload endpoint or CLI script for batch uploads

**Phase 2: Strapi Data Model**
- Create a `Gallery` collection type with metadata fields (title, slug, description, date)
- Create a `GalleryPhoto` repeatable component (r2Key, caption, order)
- Add optional relation from `Gallery` → `Post` (and vice versa)
- Add cache invalidation lifecycle hooks

**Phase 3: Frontend**
- Build `/photos` index page (gallery grid with cover images)
- Build `/photos/[slug]` gallery page (thumbnail grid + lightbox)
- Extend existing `PhotoGallery.astro` or build a new full-page gallery component
- Add gallery embed support to blog post pages (when a post has an attached gallery)
- Image URLs use CF transform syntax: `/cdn-cgi/image/w=800,q=80,f=auto/{r2-url}/{key}`

**Phase 4: Upload Workflow**
- MVP: CLI-based upload via `wrangler r2 object put` + manually add metadata in Strapi
- Future: Build a custom Strapi plugin or standalone upload UI with drag-and-drop

### Decisions

- **Upload UX:** CLI-based via `wrangler r2 object put` for MVP. Web UI can come later.

### Open Questions

1. **Gallery organization:** Flat list of galleries, or categories/albums/tags?
2. **Existing pic-time content:** Do you want to migrate photos from pic-time, or start fresh?
3. **EXIF data:** Should we extract and display EXIF metadata (camera, lens, settings)?
4. **Download originals:** Should visitors be able to download full-res versions?

## Sources

- [Cloudflare Images Pricing](https://developers.cloudflare.com/images/pricing/)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Optimizing image delivery with CF Image Resizing and R2](https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/)
- [Transform images via Workers](https://developers.cloudflare.com/images/transform-images/transform-via-workers/)
- [Images binding for Workers](https://developers.cloudflare.com/images/transform-images/bindings/)
- [Transform user-uploaded images before uploading to R2](https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/)
- [Strapi Media Library docs](https://docs.strapi.io/cms/features/media-library)
- [Strapi Cloud upload provider docs](https://docs.strapi.io/cloud/advanced/upload)
- [strapi-provider-cloudflare-r2 (Strapi Marketplace)](https://market.strapi.io/providers/strapi-provider-cloudflare-r2)
- [Cloudflare Images pricing guide (theimagecdn.com)](https://theimagecdn.com/docs/cloudflare-images-pricing)

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

Strapi data model: see "Data Model" section below
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

### Data Model

Photos are a first-class collection type (not embedded components) so they can be queried
independently for meta-galleries (e.g., "all climbing photos" across every gallery).

**Photo** (collection type):
```
photo
├── r2Key (text, required, unique) — R2 object key, e.g. "european-vacation/paris/DSC_1234.jpg"
├── caption (text)
├── dateTaken (datetime) — from EXIF or manual entry
├── exif (JSON) — extracted at upload time
│   {
│     "camera": "Fujifilm X-T5",
│     "lens": "XF 23mm f/1.4",
│     "focalLength": "23mm",
│     "aperture": "f/2.8",
│     "shutterSpeed": "1/250",
│     "iso": 400,
│     "width": 6240,
│     "height": 4160
│   }
├── tags (relation → Tag, many-to-many) — for meta-galleries
├── scene (relation → Scene, many-to-one) — which scene this belongs to
└── sortOrder (integer) — position within its scene
```

**Scene** (collection type):
```
scene
├── title (text, required) — e.g., "Paris", "Swiss Alps"
├── description (text)
├── sortOrder (integer) — position within the gallery
├── gallery (relation → Gallery, many-to-one)
├── photos (relation → Photo, one-to-many)
└── coverPhoto (relation → Photo, one-to-one, optional) — defaults to first photo
```

**Gallery** (collection type):
```
gallery
├── title (text, required) — e.g., "European Vacation 2025"
├── slug (uid, from title)
├── description (richtext)
├── date (date) — primary date for sorting
├── scenes (relation → Scene, one-to-many)
├── coverPhoto (relation → Photo, one-to-one) — hero/card image
├── post (relation → Post, optional) — attach gallery to blog post
└── tags (relation → Tag, many-to-many) — gallery-level tags
```

**Tag** (collection type):
```
tag
├── name (text, required, unique) — e.g., "climbing", "portraits", "landscape"
├── slug (uid, from name)
├── description (text, optional)
├── coverPhoto (relation → Photo, one-to-one, optional) — hero image for tag page
├── photos (relation → Photo, many-to-many, inverse) — all photos with this tag
└── galleries (relation → Gallery, many-to-many, inverse) — all galleries with this tag
```

**Post** (existing, add field):
```
post (existing)
└── gallery (relation → Gallery, one-to-one, optional) — linked gallery
```

#### URL Structure

| URL | Content | Data Source |
|-----|---------|-------------|
| `/photos` | Grid of all galleries | All galleries, sorted by date |
| `/photos/[gallery-slug]` | Single gallery with scenes | Gallery → Scenes → Photos |
| `/photos/tagged/[tag-slug]` | Meta-gallery: all photos with tag | Tag → Photos (across galleries) |
| `/blog/[slug]` (existing) | Blog post, with optional gallery embed | Post → Gallery |

#### EXIF Extraction

EXIF data is extracted at upload time by the CLI upload script using `exiftool` or a Node.js
library like `exif-reader`. The script:
1. Reads EXIF from the original file
2. Uploads the image to R2
3. Outputs a JSON manifest with R2 keys + EXIF data for import into Strapi

```bash
# Example upload script pseudocode
for file in gallery-folder/*; do
  key="gallery-slug/scene-slug/$(basename "$file")"
  wrangler r2 object put "hillpeople-photos/$key" --file "$file"
  exiftool -json "$file" >> manifest.json
done
# Then import manifest.json into Strapi via API
```

#### Web-Res Downloads

Photos are downloadable at web resolution (2048px long edge) via the CF transform URL.
A download button in the lightbox links to:
```
/cdn-cgi/image/width=2048,quality=90,format=jpeg/{r2-public-url}/{key}
```
The `Content-Disposition` header can be set by a Worker to trigger a browser download
rather than navigation.

### Lightbox Performance Strategy

The goal: hold down the right arrow key and scroll through dozens of photos with no perceptible
lag, matching the pic-time experience. This requires a three-tier image resolution system with
aggressive preloading.

#### Three Resolution Tiers

All served from the same R2 original via different CF transform URL params:

| Tier | Size | Quality | Purpose |
|------|------|---------|---------|
| Thumbnail | 300px wide | q=70 | Grid display, instant placeholder |
| Preview | 1200px wide | q=75 | Fast-scrolling lightbox view |
| Full | viewport-width (e.g. 2400px) | q=85 | Crisp final render after settling |

```
Thumbnail: /cdn-cgi/image/w=300,q=70,f=auto/{r2-origin}/{key}
Preview:   /cdn-cgi/image/w=1200,q=75,f=auto/{r2-origin}/{key}
Full:      /cdn-cgi/image/w=2400,q=85,f=auto/{r2-origin}/{key}
```

#### Preload Window

When the user is viewing photo N, keep a sliding window of preloaded preview images:

```
preloaded:  [N-2] [N-1] [N] [N+1] [N+2] [N+3]
                         ^^^
                      currently viewing
```

- Use `new Image()` objects stored in a `Map<string, HTMLImageElement>` cache
- On each navigation, shift the window: start loading the new edge images, evict old ones
- Preload ahead (3 forward, 2 back) since users more commonly advance

#### Navigation Flow (on arrow key press)

```
1. Check preview cache for target photo
   ├── HIT  → show cached preview instantly (< 1ms)
   └── MISS → show thumbnail as placeholder (already in browser cache from grid)
              └── preview loads in background → swap in when ready

2. After user stops navigating (300ms debounce):
   └── Load full-res version for the current photo
       └── When loaded, call img.decode() then swap in (no jank)

3. Shift preload window to new position
   └── Start preloading new edge images via new Image()
```

The key insight: **thumbnails are always available instantly** because the grid already loaded
them. So worst case (cache miss on preview), the user sees a slightly soft image for a fraction
of a second, never a blank frame or spinner.

#### Implementation Details

**Dual-layer image display:**
```html
<!-- Two stacked images in the lightbox -->
<img id="lightbox-base" />   <!-- shows best immediately available version -->
<img id="lightbox-full" />   <!-- layered on top, shows full-res when ready -->
```

**EXIF-driven aspect ratio:**
Since we store width/height in the EXIF JSON, we can set the lightbox container's aspect ratio
before any image loads, preventing layout shift:
```css
.lightbox-container { aspect-ratio: var(--photo-w) / var(--photo-h); }
```

**Key repeat handling:**
Browser key repeat fires rapidly (~30+ events/sec when held). The navigation itself should be
instant (just swap a cached image src), but full-res loading and preload window shifts should
be debounced/throttled to avoid a stampede of requests.

**`img.decode()` for jank-free swaps:**
Before replacing the visible image src, call `decode()` to ensure the browser has decoded the
image off the main thread:
```js
const img = new Image();
img.src = fullResUrl;
await img.decode();
lightboxFull.src = img.src; // swap is now instant, no decode jank
```

**CF edge cache advantage:**
After the first visitor loads a transformed image, it's cached at the nearest Cloudflare edge.
Subsequent visitors (and return visits) get the cached version — effectively instant. This means
the preloading strategy mainly matters for first-time cold loads; warm loads are already fast.

#### Performance Budget

| Metric | Target |
|--------|--------|
| Navigation latency (cached preview) | < 16ms (one frame) |
| Navigation latency (cache miss, show thumbnail) | < 16ms |
| Preview load (cold, CF transform) | < 200ms |
| Full-res swap after settling | < 500ms |
| Memory ceiling (preload window) | ~6 preview images × ~200KB = ~1.2MB |

### Suggested Implementation Plan

**Phase 1: Infrastructure**
- Create an R2 bucket (e.g., `hillpeople-photos`)
- Set up public access via custom domain (e.g., `photos-cdn.hillpeople.net`)
- Verify Image Transformations work with the R2 origin
- Build a simple upload endpoint or CLI script for batch uploads

**Phase 2: Strapi Data Model**
- Create `Photo` collection type (r2Key, caption, dateTaken, exif JSON, sortOrder)
- Create `Scene` collection type (title, description, sortOrder, photos relation)
- Create `Gallery` collection type (title, slug, description, date, scenes relation, coverPhoto)
- Create `Tag` collection type (name, slug, photos M2M, galleries M2M)
- Add optional `gallery` relation on existing `Post` type
- Add cache invalidation lifecycle hooks for all new types

**Phase 3: Upload Tooling**
- Build CLI upload script: takes a folder of images, extracts EXIF, uploads to R2, outputs JSON manifest
- Build Strapi import script: reads manifest, creates Photo entries via Strapi API
- Document the workflow for adding a new gallery end-to-end

**Phase 4: Frontend**
- Build `/photos` index page (gallery grid with cover images)
- Build `/photos/[gallery-slug]` page (scenes with photo grids + lightbox)
- Build `/photos/tagged/[tag-slug]` meta-gallery page
- Lightbox with EXIF display panel and web-res download button
- Add gallery embed/link on blog post pages (when post has an attached gallery)
- Image URLs use CF transform syntax: `/cdn-cgi/image/w=800,q=80,f=auto/{r2-url}/{key}`
- Add pages to Lighthouse CI and cache invalidation config

### Decisions

- **Upload UX:** CLI-based via `wrangler r2 object put` for MVP. Web UI can come later.
- **pic-time migration:** Migrate via manual download. Pic-Time has no public export API. Download full-res zips from the Workflow tab gallery by gallery, then batch upload to R2 via CLI.
- **Gallery organization:** Nested structure. Galleries contain Scenes (ordered sections). Tags provide cross-cutting meta-galleries (e.g., "all climbing photos", "all studio portraits").
- **EXIF data:** Extracted at upload time, stored as JSON on each Photo. Viewable in the frontend (lightbox or photo detail).
- **Downloads:** Web-resolution (2048px long edge, JPEG) via CF transform URL. Not full-res originals.

### Migration Plan (pic-time → R2)

1. In pic-time admin: Gallery → Workflow → Send/Download Photos → Select All → download zip (full-res)
2. Repeat for each gallery, organize into local folders by gallery name/scene
3. Run upload script (extracts EXIF, uploads to R2, generates manifest):
   ```bash
   for f in gallery-folder/scene-folder/*; do
     key="gallery-slug/scene-slug/$(basename "$f")"
     wrangler r2 object put "hillpeople-photos/$key" --file "$f"
     exiftool -json "$f" >> manifest.json
   done
   ```
4. Import manifest into Strapi via API (creates Photo entries with R2 keys + EXIF)
5. Create Gallery and Scene entries in Strapi, link to Photos
6. Verify galleries render on the new `/photos` pages
7. Cancel pic-time subscription

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

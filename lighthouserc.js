module.exports = {
  ci: {
    collect: {
      // Requires frontend/.dev.vars with STRAPI_API_URL and STRAPI_API_TOKEN
      startServerCommand: 'cd frontend && npx wrangler pages dev dist --port 8788',
      startServerReadyPattern: 'Ready on',
      url: [
        'http://localhost:8788/',
        'http://localhost:8788/climbing',
        // Blog post - CI adds dynamic slugs, this is a sample for local testing
        'http://localhost:8788/blog/fall-break-in-moab',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // Performance (0.7 threshold - external CDN latency varies locally)
        'categories:performance': ['warn', { minScore: 0.7 }],

        // Accessibility (0.85 - blog post content can vary)
        'categories:accessibility': ['error', { minScore: 0.85 }],

        // Best Practices (0.75 threshold due to Strapi CDN third-party cookies)
        'categories:best-practices': ['warn', { minScore: 0.75 }],

        // SEO (0.9 - blog post content can affect meta scores)
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        // LCP off - depends on network latency to external Strapi CDN
        'largest-contentful-paint': 'off',
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Accessibility specifics (image-alt is warn — depends on blog content)
        'image-alt': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-description': 'error',

        // SEO specifics
        'is-crawlable': 'error',
        'robots-txt': 'off', // Not relevant for local testing

        // Strapi Cloud CDN sets Cloudflare cookies (__cf_bm) - external, can't control
        'third-party-cookies': 'off',
        'inspector-issues': 'off'
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

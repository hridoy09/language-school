# SEO implementation and launch checklist

The main page is `index.html`. The previous HTML filename redirects to it.
No live domain has been provided, so no production canonical URL or sitemap is invented.

## Implemented

- Descriptive page title and meta description matching the languages and learner ages.
- A single H1, sequential coach headings, labelled sections, and crawlable anchor links.
- Open Graph and Twitter card metadata, plus a 1200 × 630 JPEG preview.
- WebPage JSON-LD describing the page, without fictional reviews, ratings, prices or business details.
- Responsive JPEG variants, explicit image dimensions, lazy loading below the fold, and asynchronous decoding.
- Prioritized hero image with matching preload; preconnections for Google Fonts.
- Ordered deferred scripts. All essential text is present in the HTML before JavaScript runs.
- SVG favicon and robots.txt allowing public content and excluding developer directories.

The original five large PNGs total 10,830,627 bytes. Their large JPEG replacements total
657,987 bytes, a 93.9% reduction. Smaller screens can download the smaller variants.
Original images are retained. This is an asset-size measurement, not a measured Core Web Vitals score.

## When the domain is ready

Run from the project directory, replacing the example with the actual public URL:

```powershell
python tools/configure-seo.py --url https://your-real-domain.com/
```

This writes the absolute canonical URL, og:url, absolute social-image URLs, URL fields in
JSON-LD, sitemap.xml, and the Sitemap declaration in robots.txt. Until then, social-image
paths are relative and cross-platform social previews are not fully configured.
For subdirectory hosting, pass the entire public base path ending in `/`.
Serve robots.txt from the domain root as required by crawler conventions.

## Before indexing a real school

1. Replace the demo school statistics, staff profiles, pricing, schedules and fictional reviews
   with accurate, approved information. Add real contact details and appropriate privacy information.
2. Configure working enquiry/newsletter submission and publish real policy pages where needed.
3. Use HTTPS and one hostname. Configure server-side permanent redirects from the old filename,
   `/index.html`, alternate hostname, and HTTP to the canonical homepage. The compatibility HTML
   redirect is a fallback; actual HTTP 301/308 redirects belong in the hosting configuration.
4. Configure compression and suitable caching for static assets. Check real HTTP response codes,
   mobile rendering, and accessible content on the public site.
5. Test with PageSpeed Insights/Lighthouse and Google's Rich Results Test. Submit the sitemap
   in Search Console and inspect the homepage. A local code audit cannot verify public indexing,
   server headers, real-user Core Web Vitals, or search rankings.

Do not use a fictitious address, reviews, ratings, course offers, or business verification in schema.
Do not add multiple hreflang entries merely because the school teaches several languages:
the current webpage itself is English and has no translated versions.

## Verification

```powershell
python tools/audit-seo.py
```

The audit reports implemented checks separately from deployment requirements. It does not
pretend a checklist percentage is a Google ranking score or a Lighthouse measurement.

References:
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

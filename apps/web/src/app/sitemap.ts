/* agent-frontmatter:start
AGENT: Sitemap metadata route
PURPOSE: Generate sitemap entries for marketing and documentation pages
USAGE: Next.js metadata route served at /sitemap.xml
EXPORTS: default
FEATURES:
  - Includes home and docs landing pages
  - Indexes all MDX docs across supported languages
  - Normalizes URLs using shared SEO helpers to avoid duplicates
SEARCHABLE: sitemap, metadata route, docs pages, seo
agent-frontmatter:end */

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { source } from "@/lib/source";

const SUPPORTED_LANGUAGES: ReadonlyArray<string> = ["en", "cn"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const seen = new Set<string>();

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      priority: 1,
      changeFrequency: "weekly",
      lastModified: now,
    },
    {
      url: absoluteUrl("/docs"),
      priority: 0.9,
      changeFrequency: "weekly",
      lastModified: now,
    },
  ];

  for (const language of SUPPORTED_LANGUAGES) {
    const pages = source.getPages(language);
    for (const page of pages) {
      const url = absoluteUrl(page.url);
      if (seen.has(url)) continue;
      seen.add(url);

      entries.push({
        url,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}

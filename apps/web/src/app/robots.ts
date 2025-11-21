/* agent-frontmatter:start
AGENT: Robots metadata route
PURPOSE: Serve crawl directives and sitemap location for the AgentStart marketing site
USAGE: Next.js metadata route served at /robots.txt
EXPORTS: default
FEATURES:
  - Allows all crawlers to index public pages
  - References the generated sitemap for discovery
  - Uses centralized site metadata for host resolution
SEARCHABLE: robots.txt, crawler rules, sitemap location, seo
agent-frontmatter:end */

import type { MetadataRoute } from "next";
import { absoluteUrl, siteMetadata } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteMetadata.siteUrl,
  };
}

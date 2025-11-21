/* agent-frontmatter:start
AGENT: Sitewide SEO configuration
PURPOSE: Centralize metadata defaults and URL helpers for the AgentStart web app
USAGE: Import in layouts and metadata routes to share titles, descriptions, and absolute URLs
EXPORTS: siteMetadata, buildRootMetadata, absoluteUrl
FEATURES:
  - Resolves metadataBase from env with safe fallback
  - Provides consistent titles, descriptions, and keyword lists
  - Generates absolute URLs for Open Graph, sitemap, and robots.txt entries
SEARCHABLE: seo config, next metadata, site url helper, open graph defaults
agent-frontmatter:end */

import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://agentstart.ai";

function resolveSiteUrl(rawUrl?: string): URL {
  try {
    return new URL(rawUrl ?? FALLBACK_SITE_URL);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

const metadataBase = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

const defaultTitle =
  "AgentStart | Batteries-included TypeScript framework for production-ready AI agents";
const defaultDescription =
  "AgentStart is a TypeScript framework that fuses prompts, tools, memory, and templates so you can assemble production-ready AI agents with minimal setup.";
const defaultKeywords = [
  "AgentStart",
  "AI agents",
  "TypeScript agent framework",
  "LLM orchestration",
  "agent tools",
  "memory adapters",
  "sandboxed execution",
  "developer productivity",
  "workflow automation",
  "edge ready templates",
];
const openGraphImage = "/logo.png";

export const siteMetadata = {
  applicationName: "AgentStart",
  metadataBase,
  siteUrl: metadataBase.origin,
  defaultTitle,
  defaultDescription,
  keywords: defaultKeywords,
  twitterHandle: "@agentstart",
  openGraphImage,
};

export function buildRootMetadata(): Metadata {
  const homeUrl = absoluteUrl("/");

  return {
    metadataBase,
    applicationName: siteMetadata.applicationName,
    title: {
      default: defaultTitle,
      template: "%s | AgentStart",
    },
    description: defaultDescription,
    keywords: defaultKeywords,
    alternates: {
      canonical: homeUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: homeUrl,
      siteName: siteMetadata.applicationName,
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: openGraphImage,
          width: 1200,
          height: 630,
          alt: "AgentStart brand thumbnail",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteMetadata.twitterHandle,
      creator: siteMetadata.twitterHandle,
      title: defaultTitle,
      description: defaultDescription,
      images: [openGraphImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    authors: [
      {
        name: "Xinyao",
        url: "https://github.com/xinyao27",
      },
    ],
    creator: "Xinyao",
    publisher: "AgentStart",
    category: "technology",
  };
}

export function absoluteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, metadataBase).toString();
}

/* agent-frontmatter:start
AGENT: Root app layout and metadata
PURPOSE: Configure global providers, fonts, analytics, and default SEO for the web app
USAGE: Next.js root layout wrapper applied to all routes
EXPORTS: metadata, RootLayout
FEATURES:
  - Applies global font and CSS baseline
  - Registers Fumadocs provider for docs and landing pages
  - Injects Google Analytics tracking
  - Supplies site-wide default metadata for SEO and social cards
SEARCHABLE: root layout, next metadata, global providers, seo defaults
agent-frontmatter:end */

import "@/app/global.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { buildRootMetadata } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
        <GoogleAnalytics gaId="G-J59YLZ3T0T" />
      </body>
    </html>
  );
}

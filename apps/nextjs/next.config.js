/* agent-frontmatter:start
AGENT: Next.js configuration file
PURPOSE: Configure Next.js build and runtime behavior
FEATURES:
  - Environment validation at build time
  - Monorepo package transpilation
  - Image optimization configuration
  - MDX support for Fumadocs
SEARCHABLE: next config, build configuration, image domains, mdx, fumadocs
agent-frontmatter:end */

import { createJiti } from "jiti";
import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /* agent-frontmatter:start
  AGENT: Transpile monorepo packages for hot reloading
  These packages will be built by Next.js instead of requiring a separate build step
  agent-frontmatter:end */
  transpilePackages: [
    "@acme/api",
    "@acme/auth",
    "@acme/config",
    "@acme/db",
    "@acme/email",
    "@acme/errors",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

const withMDX = createMDX();
const withNextIntl = createNextIntlPlugin({
  experimental: {
    // Provide the path to the messages that you're using in `AppConfig`
    createMessagesDeclaration: "./src/i18n/messages/en.json",
  },
});

export default withNextIntl(withMDX(config));

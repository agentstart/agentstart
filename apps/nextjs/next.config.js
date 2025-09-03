// AGENT: Next.js configuration file
// PURPOSE: Configure Next.js build and runtime behavior
// FEATURES:
//   - Environment validation at build time
//   - Monorepo package transpilation
//   - Image optimization configuration
// SEARCHABLE: next config, build configuration, image domains

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /**
   * AGENT: Transpile monorepo packages for hot reloading
   * These packages will be built by Next.js instead of requiring a separate build step
   */
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

export default config;

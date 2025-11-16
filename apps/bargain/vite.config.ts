/* agent-frontmatter:start
AGENT: Build configuration
PURPOSE: Configures the Vite + TanStack Start toolchain for the bargain app.
USAGE: Loaded by Vite/Cloudflare builds to compile both client and worker bundles.
EXPORTS: default
FEATURES:
  - Registers Cloudflare, TanStack Start, Tailwind, and React plugins
  - Enables tsconfig-based path aliases
  - Skips heavy devtools plugins during production builds to reduce memory usage
SEARCHABLE: vite config, tanstack start, bargain, build pipeline
agent-frontmatter:end */

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";

const config = defineConfig(({ command }) => {
  const enableDevtools = command === "serve";

  return {
    plugins: [
      ...(enableDevtools ? [devtools()] : []),
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      // this is the plugin that enables path aliases
      viteTsConfigPaths(),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
    optimizeDeps: {
      include: ["agentstart"],
    },
    build: {
      rollupOptions: {
        // Mark Node.js built-ins as external to be excluded from bundle
        // This prevents the "require is not defined" error in Workers
        external: ["assert", "buffer", "stream", "util", "net", "tls", "http", "https"] as any,
      },
      minify: "oxc",
      cssMinify: "lightningcss",
    },
  };
});

export default config;

/* agent-frontmatter:start
AGENT: Home feature definitions
PURPOSE: Define marketing feature cards for the landing page grid
USAGE: Import featureCards for navigation or render the Features grid component
EXPORTS: Features, FeatureCard, featureCards
FEATURES:
  - Lists landing page features with names, descriptions, icons, and targets
  - Shares feature metadata with navigation for consistent linking
SEARCHABLE: home features, feature cards, landing grid, navigation data
agent-frontmatter:end */

import {
  CloudArrowUpIcon,
  CodeIcon,
  CodesandboxLogoIcon,
  DatabaseIcon,
  OpenAiLogoIcon,
  ShapesIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactElement } from "react";
import { BentoCard, BentoGrid } from "@/components/bento-grid";

export type FeatureCard = {
  name: string;
  description: string;
  href: string;
  cta: string;
  Icon: typeof OpenAiLogoIcon;
  className: string;
  background?: ReactElement | null;
};

export const featureCards = [
  {
    name: "Agent Runtime & API",
    description:
      "AI SDK-powered runtime with oRPC endpoints so the server and client stay type-safe from agentStart() to start.api.*.",
    href: "/docs/basic-usage",
    cta: "Runtime docs",
    Icon: OpenAiLogoIcon,
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="pointer-events-none absolute inset-0">
        <OpenAiLogoIcon
          className="-right-4 -top-6 absolute h-32 w-32 text-foreground/10"
          weight="duotone"
        />
      </div>
    ),
  },
  {
    name: "Data & CLI",
    description:
      "Schema-aware CLI plus adapters for Postgres, MySQL, SQLite, and Mongo keep memory layers in sync.",
    href: "/docs/concepts/cli",
    cta: "CLI docs",
    Icon: DatabaseIcon,
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="pointer-events-none absolute inset-0">
        <DatabaseIcon className="-right-6 absolute top-8 h-28 w-28 text-foreground/10" />
      </div>
    ),
  },
  {
    name: "UI Components",
    description:
      "Prebuilt conversation, prompt input, and sidebar components wired to the agent provider for drop-in chat surfaces.",
    href: "/docs/components/overview",
    cta: "Components docs",
    Icon: ShapesIcon,
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="pointer-events-none absolute inset-0">
        <ShapesIcon className="-right-4 absolute top-6 h-28 w-28 text-foreground/10" />
      </div>
    ),
  },
  {
    name: "Tools & Sandbox",
    description:
      "Ship built-in todo tools, or extend with Node.js and E2B sandboxes for filesystem, bash, and git APIs.",
    href: "/docs/concepts/sandbox",
    cta: "Sandbox docs",
    Icon: CodesandboxLogoIcon,
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="pointer-events-none absolute inset-0">
        <CodesandboxLogoIcon className="-right-6 -top-6 absolute h-32 w-32 text-foreground/10" />
      </div>
    ),
  },
  {
    name: "Blob Storage & Uploads",
    description:
      "Optional adapters for Vercel Blob, AWS S3, and Cloudflare R2 keep multimodal inputs organized.",
    href: "/docs/concepts/blob-storage",
    cta: "Blob docs",
    Icon: CloudArrowUpIcon,
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="pointer-events-none absolute inset-0">
        <CloudArrowUpIcon className="-right-8 -top-4 absolute h-32 w-32 text-foreground/10" />
      </div>
    ),
  },
  {
    name: "Templates & Integrations",
    description:
      "Ready-to-ship handlers for Next.js, Tanstack Start. so you can drop the agent into any API surface quickly.",
    href: "/docs/integrations/next",
    cta: "Integration guides",
    Icon: CodeIcon,
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="pointer-events-none absolute inset-0">
        <CodeIcon className="-right-4 absolute top-4 h-28 w-28 text-foreground/10" />
      </div>
    ),
  },
] satisfies FeatureCard[];

export function Features() {
  return (
    <section className="border-border border-t bg-background py-24">
      <div className="container mx-auto px-4">
        <BentoGrid>
          {featureCards.map(({ background = null, className, ...card }) => (
            <BentoCard
              key={card.name}
              className={className}
              background={background}
              {...card}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <span className="text-3xl">❖</span>
          AgentStart
        </div>
      ),
      transparentMode: "top",
    },
    githubUrl: "https://github.com/agentstart/agentstart",
    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [
      {
        text: "Documentation",
        url: `/docs`,
        active: "nested-url",
      },
    ],
  };
}

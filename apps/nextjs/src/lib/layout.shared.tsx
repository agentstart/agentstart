import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Agent Stack",
    },
    links: [
      {
        text: "Documentation",
        url: "/docs",
      },
      {
        text: "Dashboard",
        url: "/dashboard",
      },
    ],
  };
}

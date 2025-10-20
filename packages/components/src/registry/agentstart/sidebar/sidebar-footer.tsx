/* agent-frontmatter:start
AGENT: Sidebar footer
PURPOSE: Render optional footer content for the agent sidebar
USAGE: <SidebarFooter footer={footer} />
EXPORTS: SidebarFooter, SidebarFooterSectionProps
FEATURES:
  - Wraps custom footer nodes in the shadcn sidebar footer element
  - Avoids rendering when no footer content is provided
SEARCHABLE: agent sidebar, footer slot, layout footer
agent-frontmatter:end */

"use client";

import type { ReactNode } from "react";
import { SidebarFooter as ShadcnSidebarFooter } from "@/components/ui/sidebar";

export type SidebarFooterProps = {
  footer?: ReactNode;
};

export function SidebarFooter({ footer }: SidebarFooterProps) {
  if (!footer) {
    return null;
  }

  return <ShadcnSidebarFooter>{footer}</ShadcnSidebarFooter>;
}

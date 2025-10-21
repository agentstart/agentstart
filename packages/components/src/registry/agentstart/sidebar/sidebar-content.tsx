/* agent-frontmatter:start
AGENT: Sidebar content
PURPOSE: Render the agent sidebar thread list and pagination controls
USAGE: <SidebarContent hasNextPage={hasNextPage} ...>{threads}</SidebarContent>
EXPORTS: SidebarContent, SidebarContentSectionProps
FEATURES:
  - Displays recent conversations with scrollable layout
  - Provides a “Load more” control for paginated results
SEARCHABLE: agent sidebar, thread list, pagination controls
agent-frontmatter:end */

"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarContent as ShadcnSidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";

export type SidebarContentProps = {
  children: ReactNode;
};

export function SidebarContent({ children }: SidebarContentProps) {
  const { open } = useSidebar();
  if (!open) return null;

  return (
    <ShadcnSidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Recent threads</SidebarGroupLabel>
        <SidebarGroupContent>
          <ScrollArea className="h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
            <SidebarMenu className="w-[calc(var(--sidebar-width)-(var(--spacing)*4))]">
              {children}
            </SidebarMenu>
          </ScrollArea>
        </SidebarGroupContent>
      </SidebarGroup>
    </ShadcnSidebarContent>
  );
}

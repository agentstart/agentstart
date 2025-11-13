/* agent-frontmatter:start
AGENT: Sidebar content
PURPOSE: Render the agent sidebar thread list with scrollable layout
USAGE: <SidebarContent>{threadList}</SidebarContent>
EXPORTS: SidebarContent, SidebarContentProps
FEATURES:
  - Displays thread list with scrollable layout
  - Wraps children in SidebarMenu component
  - Provides consistent spacing and styling
SEARCHABLE: agent sidebar, thread list, sidebar content
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
  if (!open) return <ShadcnSidebarContent />;

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

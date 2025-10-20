/* agent-frontmatter:start
AGENT: Sidebar header
PURPOSE: Render the agent sidebar header with controls and actions
USAGE: <SidebarHeader header={header} sidebar={sidebar} />
EXPORTS: SidebarHeader, SidebarHeaderSectionProps
FEATURES:
  - Displays title, description, and optional custom actions
  - Provides responsive toggle controls for the sidebar
SEARCHABLE: agent sidebar, header layout, sidebar controls
agent-frontmatter:end */

"use client";

import { NotePencilIcon, SidebarIcon } from "@phosphor-icons/react";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
  SidebarHeader as ShadcnSidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SidebarHeaderProps = {
  title: React.ReactNode;
};

export function SidebarHeader({ title }: SidebarHeaderProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <ShadcnSidebarHeader>
      <div
        className={cn("flex items-center gap-2", {
          "justify-between": open,
          "justify-center": !open,
        })}
      >
        {open && (
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-sm">
                {title ?? "LOGO"}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* trigger sidebar */}
          <SidebarMenuButton onClick={toggleSidebar}>
            <SidebarIcon weight="duotone" className="!size-4.5" />
            <span className="sr-only">Toggle sidebar</span>
          </SidebarMenuButton>
        </div>
      </div>

      <SidebarMenu>
        <SidebarMenuItem>
          <a href="/">
            <SidebarMenuButton>
              <NotePencilIcon weight="duotone" className="!size-4.5" />
              <span>New Thread</span>
            </SidebarMenuButton>
          </a>
        </SidebarMenuItem>
      </SidebarMenu>
    </ShadcnSidebarHeader>
  );
}

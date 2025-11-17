/* agent-frontmatter:start
AGENT: Sidebar header
PURPOSE: Render the agent sidebar header with controls and actions
USAGE: <SidebarHeader title={title} />
EXPORTS: SidebarHeader, SidebarHeaderProps
FEATURES:
  - Displays title and sidebar toggle control
  - Provides "New Thread" action button with navigation
  - Responsive layout with conditional title visibility
SEARCHABLE: agent sidebar, header layout, sidebar controls
agent-frontmatter:end */

"use client";

import { NotePencilIcon, SidebarIcon } from "@phosphor-icons/react";
import { useAgentStartContext } from "agentstart/client";
import type React from "react";
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
  const { navigate } = useAgentStartContext();
  const { open, toggleSidebar } = useSidebar();

  return (
    <ShadcnSidebarHeader>
      <div
        className={cn(
          "flex items-center gap-2",
          open ? "justify-between" : "justify-center",
        )}
      >
        {open && (
          <div className="flex items-center pl-2.5">
            <span className="truncate font-semibold text-sm">
              {title ?? "LOGO"}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* trigger sidebar */}
          <SidebarMenuButton onClick={toggleSidebar}>
            <SidebarIcon
              weight="duotone"
              className="size-4.5! cursor-pointer"
            />
            <span className="sr-only">Toggle sidebar</span>
          </SidebarMenuButton>
        </div>
      </div>

      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="cursor-pointer"
            onClick={() => navigate("/")}
          >
            <NotePencilIcon weight="duotone" className="size-4.5!" />
            <span>New Thread</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </ShadcnSidebarHeader>
  );
}

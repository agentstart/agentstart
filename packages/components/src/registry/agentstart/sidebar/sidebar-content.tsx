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

import { Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarContent as ShadcnSidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

export type SidebarContentProps = {
  children: ReactNode;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore?: () => void;
};

export function SidebarContent({
  children,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: SidebarContentProps) {
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
      {hasNextPage ? (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    variant="outline"
                    disabled={isFetchingNextPage}
                    onClick={() => {
                      if (hasNextPage && !isFetchingNextPage) {
                        onLoadMore?.();
                      }
                    }}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                        Loading more…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </ShadcnSidebarContent>
  );
}

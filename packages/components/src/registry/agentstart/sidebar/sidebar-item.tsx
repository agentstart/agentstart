/* agent-frontmatter:start
AGENT: Sidebar item
PURPOSE: Render a single thread row inside the agent sidebar
USAGE: <SidebarItem thread={thread} onSelect={handleSelect} />
EXPORTS: SidebarItem, SidebarItemProps
FEATURES:
  - Displays title, timestamp, and optional leading/trailing content
  - Supports active and disabled states for navigation
  - Computes human-readable relative timestamps by default
SEARCHABLE: agent layout, list item, sidebar row
agent-frontmatter:end */

"use client";

import { formatRelativeFromNow } from "@agentstart/utils";
import type { DBThread } from "agentstart/memory";
import type { ReactNode } from "react";
import { memo, useMemo } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SidebarItemProps = {
  thread: DBThread;
  leading?: ReactNode;
  trailing?: ReactNode;
  secondaryText?: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  onSelect?: (thread: DBThread) => void;
};

export const SidebarItem = memo(function SidebarItem({
  thread,
  leading,
  trailing,
  secondaryText,
  isActive = false,
  disabled = false,
  className,
  onSelect,
}: SidebarItemProps) {
  const computedSecondaryText = useMemo(() => {
    if (secondaryText === null) {
      return null;
    }
    if (secondaryText !== undefined) {
      return secondaryText;
    }
    return formatRelativeFromNow(thread.updatedAt ?? thread.createdAt);
  }, [secondaryText, thread.createdAt, thread.updatedAt]);

  return (
    <SidebarMenuItem className={className}>
      <SidebarMenuButton
        type="button"
        isActive={isActive}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            onSelect?.(thread);
          }
        }}
        className="group/sidebar-item cursor-pointer"
      >
        <div className="flex w-full items-center gap-3 overflow-hidden">
          {leading && <div className="shrink-0">{leading}</div>}
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex-1 truncate font-medium text-sm">
                  {thread.title || "Untitled thread"}
                </span>
              }
            />
            {computedSecondaryText && (
              <TooltipContent>
                <span className="space-x-1">
                  <span>{thread.title || "Untitled thread"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {computedSecondaryText}
                  </span>
                </span>
              </TooltipContent>
            )}
          </Tooltip>
          {trailing && (
            <div className="invisible shrink-0 group-hover/sidebar-item:visible">
              {trailing}
            </div>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

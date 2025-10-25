/* agent-frontmatter:start
AGENT: Sidebar layout
PURPOSE: Compose a shadcn sidebar that lists AgentStart threads using TanStack Query
USAGE: <Sidebar>{mainContent}</Sidebar>
EXPORTS: Sidebar, SidebarProps
FEATURES:
  - Fetches threads via TanStack Query with automatic caching and refetching
  - Supports infinite scroll pagination, thread creation, and selection callbacks
  - Wraps children inside <SidebarInset> for a ready-to-use layout
SEARCHABLE: agent layout, sidebar, agent threads list, tanstack query
agent-frontmatter:end */

"use client";

import {
  DotsThreeIcon,
  EmptyIcon,
  PencilSimpleIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { DBThread } from "agentstart/db";
import { type ReactNode, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sidebar as ShadcnSidebar,
  SidebarInset,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAgentStartContext } from "../provider";
import { SidebarContent } from "./sidebar-content";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarHeader } from "./sidebar-header";
import { SidebarItem } from "./sidebar-item";

export type SidebarProps = {
  children?: ReactNode;
  className?: string;
  // Thread selection
  selectedThreadId?: string;
  onSelectThread?: (thread: DBThread) => void;
  // Query configuration
  pageSize?: number;
  // UI customization
  header?: {
    title?: string;
  };
  footer?: ReactNode;
  emptyState?: ReactNode;
  errorState?: (error: Error, retry: () => void) => ReactNode;
  // Sidebar configuration
  sidebar?: {
    variant?: "sidebar" | "floating" | "inset";
    side?: "left" | "right";
    collapsible?: "offcanvas" | "icon" | "none";
    className?: string;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  };
};

export function Sidebar({
  children,
  className,
  selectedThreadId,
  onSelectThread,
  pageSize = 20,
  header,
  footer,
  emptyState,
  errorState,
  sidebar,
}: SidebarProps) {
  const { orpc } = useAgentStartContext();

  // Infinite query for thread list with pagination
  const { data, error, isLoading, isError, refetch } = useQuery(
    orpc.thread.list.queryOptions({
      input: { pageSize },
    }),
  );

  // Rename mutation
  const updateMutation = useMutation(
    orpc.thread.update.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  // Delete mutation
  const deleteMutation = useMutation(
    orpc.thread.delete.mutationOptions({
      onSuccess: () => {
        // Invalidate and refetch the thread list
        refetch();
      },
    }),
  );

  // Flatten all pages into a single array of threads
  const threads = useMemo(() => {
    if (!data) return [];
    return data.threads.map((thread) => normalizeThread(thread));
  }, [data]);

  const renderThreads = useMemo(() => {
    if (isLoading && threads.length === 0) {
      return Array.from({ length: 6 }).map((_, index) => (
        <SidebarMenuSkeleton key={`thread-skeleton-${index}`} showIcon />
      ));
    }

    if (isError && error) {
      if (errorState) {
        return errorState(error, refetch);
      }
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningCircleIcon
                weight="duotone"
                className="size-5 text-destructive"
              />
            </EmptyMedia>
            <EmptyTitle>Failed to load threads</EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </EmptyContent>
        </Empty>
      );
    }

    if (threads.length === 0) {
      if (emptyState) {
        return emptyState;
      }
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <EmptyIcon
                weight="duotone"
                className="size-5 text-muted-foreground"
              />
            </EmptyMedia>
            <EmptyTitle>No threads</EmptyTitle>
            <EmptyDescription>
              Start chatting with the agent to see conversations here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    const items = threads.map((thread) => (
      <SidebarItem
        key={thread.id}
        thread={thread}
        isActive={thread.id === selectedThreadId}
        onSelect={onSelectThread}
        leading={<ThreadAvatar title={thread.title} />}
        trailing={
          <MoreOptions
            threadTitle={thread.title ?? "Thread"}
            onRename={(title) =>
              updateMutation.mutate({
                threadId: thread.id,
                data: { title },
              })
            }
            onDelete={() => deleteMutation.mutate({ threadId: thread.id })}
          />
        }
      />
    ));

    return items;
  }, [
    selectedThreadId,
    emptyState,
    error,
    errorState,
    refetch,
    onSelectThread,
    isError,
    isLoading,
    threads,
    deleteMutation.mutate,
    updateMutation.mutate,
  ]);

  return (
    <SidebarProvider
      defaultOpen={sidebar?.defaultOpen}
      open={sidebar?.open}
      onOpenChange={sidebar?.onOpenChange}
      className={className}
    >
      <ShadcnSidebar
        variant={sidebar?.variant ?? "sidebar"}
        side={sidebar?.side ?? "left"}
        collapsible={sidebar?.collapsible ?? "icon"}
        className={cn(
          sidebar?.side === "right" ? "border-l" : "border-r",
          "border-sidebar-border/60",
          sidebar?.className,
        )}
      >
        <SidebarHeader title={header?.title} />
        <SidebarContent>{renderThreads}</SidebarContent>
        <SidebarFooter footer={footer} />
        <SidebarRail />
      </ShadcnSidebar>
      <SidebarInset className="h-screen bg-accent/80">{children}</SidebarInset>
    </SidebarProvider>
  );
}

function normalizeThread(thread: DBThread): DBThread {
  return {
    ...thread,
    createdAt:
      thread.createdAt instanceof Date
        ? thread.createdAt
        : new Date(thread.createdAt),
    updatedAt:
      thread.updatedAt instanceof Date
        ? thread.updatedAt
        : new Date(thread.updatedAt),
  };
}

function ThreadAvatar({ title }: { title?: string | null }) {
  const displayTitle = title || "Thread";
  const initials = displayTitle
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <div className="flex size-6 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/40 font-semibold text-[11px] text-sidebar-foreground uppercase">
      {initials || "AI"}
    </div>
  );
}

function MoreOptions({
  threadTitle,
  onRename,
  onDelete,
}: {
  threadTitle: string;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const handleRename = () => {
    const newTitle = window.prompt("Enter new thread title:", threadTitle);
    if (newTitle?.trim() && newTitle !== threadTitle) {
      onRename(newTitle.trim());
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${threadTitle}"?`)) {
      onDelete();
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <div className="flex size-5 cursor-pointer items-center justify-center rounded-md hover:bg-gray-200">
              <DotsThreeIcon className="size-4" />
            </div>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <TooltipContent>
          <span>More options</span>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleRename}>
          <PencilSimpleIcon weight="duotone" className="size-4.5" />{" "}
          <span>Rename</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete}>
          <TrashIcon
            weight="duotone"
            className="size-4.5 text-destructive"
            color="currentColor"
          />{" "}
          <span className="text-destructive">Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

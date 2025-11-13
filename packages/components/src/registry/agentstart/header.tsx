/* agent-frontmatter:start
AGENT: Thread header component
PURPOSE: Display thread title and metadata using oRPC
USAGE: <Header threadId={threadId} />
EXPORTS: Header, HeaderProps, HeaderSkeleton
FEATURES:
  - Fetches thread data using TanStack Query and oRPC
  - Displays thread title, visibility, and timestamps
  - Provides loading skeleton state
  - Error handling with retry functionality
SEARCHABLE: thread header, thread title, thread info, orpc header
agent-frontmatter:end */

"use client";

import {
  GearIcon,
  PencilSimpleIcon,
  PencilSimpleLineIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAgentStartContext } from "agentstart/client";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./relative-time";

export type HeaderProps = ComponentProps<"header"> & {
  /**
   * Custom loading state element while fetching thread data
   */
  loadingState?: ReactNode;
  /**
   * Custom error renderer when fetching thread fails
   */
  errorState?: (error: Error, retry: () => void) => ReactNode;
  /**
   * Hide specific metadata fields
   */
  hideMetadata?: {
    visibility?: boolean;
    timestamps?: boolean;
    userId?: boolean;
  };
  /**
   * Custom element to render before the header content
   */
  leading?: ReactNode;
  /**
   * Custom element to render after the header content
   */
  trailing?: ReactNode;
  /**
   * Callback when thread is renamed
   */
  onRename?: (threadId: string, newTitle: string) => void;
  /**
   * Callback when thread is deleted
   */
  onDelete?: (threadId: string) => void;
  /**
   * Hide the settings button
   */
  hideSettings?: boolean;
};

export function Header({
  className,
  loadingState,
  errorState,
  hideMetadata = {},
  leading,
  trailing,
  onRename,
  onDelete,
  hideSettings = false,
  ...props
}: HeaderProps) {
  const { orpc, threadId } = useAgentStartContext();

  const { data, error, isLoading, isError, refetch } = useQuery(
    orpc.thread.get.queryOptions({
      input: { threadId: threadId! },
      enabled: !!threadId,
    }),
  );
  const queryClient = useQueryClient();

  // Rename mutation
  const updateMutation = useMutation(
    orpc.thread.update.mutationOptions({
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries(orpc.thread.list.queryOptions());
      },
    }),
  );

  // Delete mutation
  const deleteMutation = useMutation(
    orpc.thread.delete.mutationOptions({
      onSuccess: () => {
        onDelete?.(threadId!);
      },
    }),
  );

  if (isLoading) {
    return loadingState ?? <HeaderSkeleton className={className} />;
  }

  if (isError && error) {
    const defaultErrorState = (
      <header
        className={cn(
          "flex items-center justify-between gap-1 border-b bg-background px-6 py-3",
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-2 text-destructive">
          <WarningCircleIcon className="size-5" weight="duotone" />
          <span className="font-medium text-sm">Failed to load thread</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </header>
    );

    return errorState?.(error, () => refetch()) ?? defaultErrorState;
  }

  if (!data?.thread) {
    return null;
  }

  const { thread } = data;

  const handleRename = () => {
    const newTitle = window.prompt(
      "Enter new thread title:",
      thread.title ?? "",
    );
    if (newTitle?.trim() && newTitle !== thread.title) {
      updateMutation.mutate({
        threadId: threadId!,
        data: { title: newTitle.trim() },
      });
      onRename?.(threadId!, newTitle.trim());
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${thread.title ?? "this thread"}"?`,
      )
    ) {
      deleteMutation.mutate({ threadId: threadId! });
    }
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-1 border-b bg-background px-6 py-3",
        className,
      )}
      {...props}
    >
      {leading}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <h1
                className="group max-w-1/2 cursor-pointer truncate font-semibold text-base hover:underline"
                onClick={handleRename}
              >
                {thread.title}
                <PencilSimpleLineIcon
                  weight="duotone"
                  className="-mt-0.5 ml-1 inline size-4! opacity-0 group-hover:opacity-100"
                />
              </h1>
            }
          />
          <TooltipContent>
            <p>Rename</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {!hideMetadata.timestamps && (thread.updatedAt || thread.createdAt) && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <RelativeTime
              leading={<span>{thread.updatedAt ? "Updated" : "Created"}</span>}
              timestamp={thread.updatedAt || thread.createdAt}
            />
          </span>
        </div>
      )}

      {!hideSettings && (
        <Menu>
          <Tooltip>
            <MenuTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button variant="ghost" size="icon-sm">
                      <GearIcon weight="duotone" className="size-4" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>
              <span>Settings</span>
            </TooltipContent>
          </Tooltip>

          <MenuPopup>
            <MenuGroup>
              <MenuGroupLabel>Thread Settings</MenuGroupLabel>

              <MenuItem onClick={handleRename}>
                <PencilSimpleIcon weight="duotone" className="size-4.5" />{" "}
                <span>Rename</span>
              </MenuItem>
              <MenuItem onClick={handleDelete}>
                <TrashIcon
                  weight="duotone"
                  className="size-4.5 text-destructive"
                  color="currentColor"
                />{" "}
                <span className="text-destructive">Delete</span>
              </MenuItem>
            </MenuGroup>
          </MenuPopup>
        </Menu>
      )}

      {trailing}
    </header>
  );
}

export type HeaderSkeletonProps = ComponentProps<"header">;

export function HeaderSkeleton({ className, ...props }: HeaderSkeletonProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-1 border-b bg-background px-6 py-3",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
      </div>
    </header>
  );
}

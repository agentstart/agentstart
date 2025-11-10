/* agent-frontmatter:start
AGENT: File explorer container component with animated tree view
PURPOSE: Complete file tree explorer with search, filtering, and smooth animations
USAGE: import { FileExplorer, FileTreeProvider, useFileTree, FileNode } from "@/components/agent/file-explorer"
EXPORTS: FileExplorer, FileTreeProvider, useFileTree, FileNode, FileTreeNode
FEATURES:
  - File tree display with React Context state management
  - Animated expand/collapse with motion library
  - Recursive tree node rendering with smooth transitions
  - Search and filter functionality
  - Tree connection lines
  - ScrollArea integration
  - Keyboard navigation
  - File tree data storage and expansion tracking
  - Phosphor icon integration
SEARCHABLE: file explorer, file browser, directory tree, file navigation, file tree context, animated tree
agent-frontmatter:end */

"use client";

import { ContextMenu } from "@base-ui-components/react/context-menu";
import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  CopyIcon,
  DownloadIcon,
  EmptyIcon,
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAgentStartContext } from "agentstart/client";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarMenuSkeleton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FileNode {
  name: string;
  path: string;
  parentPath: string;
  isFile: boolean;
  isDirectory: boolean;
  children?: Map<string, FileNode>;
  /** Git change information for the file */
  changes?: {
    status: "added" | "modified" | "deleted" | "renamed" | "untracked";
    additions: number;
    deletions: number;
  };
}

interface FileTreeState {
  // State
  fileTree: Map<string, FileNode>;
  expandedPaths: Set<string>;
  selectedPath: string | null;

  // Actions
  setFileTree: (entries: FileNode[]) => void;
  toggleExpanded: (path: string) => void;
  setSelectedPath: (path: string | null) => void;
  clearAll: () => void;
}

export interface FileExplorerProps {
  /** Initial file tree data (flat list of entries) - optional, if not provided, will fetch via API */
  entries?: FileNode[];
  /** Callback when a file is clicked */
  onFileClick?: (node: FileNode) => void;
  /** Optional class name for the container */
  className?: string;
  /** Whether to show search input */
  showSearch?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Query configuration - only used when entries is not provided */
  query?: {
    /** Path to list (default: "/") */
    path?: string;
    /** Whether to recursively list subdirectories (default: false) */
    recursive?: boolean;
    /** Glob patterns to ignore */
    ignore?: string[];
  };
  /** Thread ID to extract file changes from agent operations */
  threadId?: string;
  /** Custom empty state */
  emptyState?: ReactNode;
  /** Custom error state */
  errorState?: (error: Error, retry: () => void) => ReactNode;
  /** Show tree connection lines */
  showLines?: boolean;
  /** Indentation per level in pixels */
  indent?: number;
  /** Enable expand/collapse animations */
  animateExpand?: boolean;
}

// ============================================================================
// Context & Provider
// ============================================================================

const FileTreeContext = createContext<FileTreeState | undefined>(undefined);

export function FileTreeProvider({ children }: { children: ReactNode }) {
  const [fileTree, setFileTreeState] = useState<Map<string, FileNode>>(
    new Map(),
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPathState] = useState<string | null>(null);

  const setFileTree = useCallback((entries: FileNode[]) => {
    const newFileTree = new Map<string, FileNode>();

    // First pass: create all nodes
    for (const entry of entries) {
      newFileTree.set(entry.path, {
        ...entry,
        children: entry.isDirectory ? new Map() : undefined,
      });
    }

    // Second pass: build parent-child relationships
    for (const entry of entries) {
      if (entry.parentPath) {
        const parent = newFileTree.get(entry.parentPath);
        if (parent?.children) {
          parent.children.set(entry.path, newFileTree.get(entry.path)!);
        }
      }
    }

    setFileTreeState(newFileTree);
  }, []);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  const setSelectedPath = useCallback((path: string | null) => {
    setSelectedPathState(path);
  }, []);

  const clearAll = useCallback(() => {
    setFileTreeState(new Map());
    setExpandedPaths(new Set());
    setSelectedPathState(null);
  }, []);

  const value = useMemo<FileTreeState>(
    () => ({
      fileTree,
      expandedPaths,
      selectedPath,
      setFileTree,
      toggleExpanded,
      setSelectedPath,
      clearAll,
    }),
    [
      fileTree,
      expandedPaths,
      selectedPath,
      setFileTree,
      toggleExpanded,
      setSelectedPath,
      clearAll,
    ],
  );

  return (
    <FileTreeContext.Provider value={value}>
      {children}
    </FileTreeContext.Provider>
  );
}

export function useFileTree(): FileTreeState {
  const context = useContext(FileTreeContext);
  if (context === undefined) {
    throw new Error("useFileTree must be used within a FileTreeProvider");
  }
  return context;
}

// ============================================================================
// File Explorer Components
// ============================================================================

function FileExplorerContent({
  onFileClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onRefresh,
  showSearch = true,
  searchPlaceholder = "Search files...",
  showLines = true,
  indent = 20,
  animateExpand = true,
}: Omit<
  FileExplorerProps,
  "entries" | "className" | "query" | "threadId" | "emptyState" | "errorState"
> & {
  onRename?: (node: FileNode, newName: string) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (node: FileNode) => void;
  onCreateFolder?: (node: FileNode) => void;
  onDownload?: (node: FileNode) => void;
  onRefresh?: () => void;
}) {
  const { fileTree } = useFileTree();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter root nodes based on search query
  const filteredRoots = useMemo(() => {
    const roots = Array.from(fileTree.values()).filter(
      (node) => !node.parentPath || node.parentPath === "/",
    );

    if (!searchQuery.trim()) {
      return roots;
    }

    const query = searchQuery.toLowerCase();
    return roots.filter((node) => node.name.toLowerCase().includes(query));
  }, [fileTree, searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Create a root node for context menu on empty space
  const rootNode: FileNode = {
    name: "/",
    path: "/",
    parentPath: "",
    isFile: false,
    isDirectory: true,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search input */}
      {showSearch && (
        <div className="border-b p-2">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>
                <MagnifyingGlassIcon weight="duotone" />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  onClick={handleClearSearch}
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                >
                  <XIcon className="size-3" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      )}

      {/* File tree */}
      <ScrollArea style={{ flex: 1 }}>
        <ContextMenu.Root>
          <ContextMenu.Trigger className="min-h-full">
            <motion.div
              className="min-h-full p-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {filteredRoots.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {searchQuery ? "No files found" : "No files to display"}
                </div>
              ) : (
                filteredRoots.map((node, index) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    onFileClick={onFileClick}
                    onRename={onRename}
                    onDelete={onDelete}
                    onCreateFile={onCreateFile}
                    onCreateFolder={onCreateFolder}
                    onDownload={onDownload}
                    onRefresh={onRefresh}
                    isLast={index === filteredRoots.length - 1}
                    showLines={showLines}
                    indent={indent}
                    animateExpand={animateExpand}
                  />
                ))
              )}
            </motion.div>
          </ContextMenu.Trigger>

          <ContextMenu.Portal>
            <ContextMenu.Positioner className="z-50" sideOffset={4}>
              <ContextMenu.Popup
                className={cn(
                  "min-w-48 rounded-lg border bg-popover p-1 shadow-lg",
                  "data-[state=closed]:animate-out data-[state=open]:animate-in",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                )}
              >
                {/* New File */}
                {onCreateFile && (
                  <ContextMenu.Item
                    className={cn(
                      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    )}
                    onClick={() => onCreateFile(rootNode)}
                  >
                    <FilePlusIcon className="size-4" weight="duotone" />
                    <span>New File</span>
                  </ContextMenu.Item>
                )}

                {/* New Folder */}
                {onCreateFolder && (
                  <ContextMenu.Item
                    className={cn(
                      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    )}
                    onClick={() => onCreateFolder(rootNode)}
                  >
                    <FolderPlusIcon className="size-4" weight="duotone" />
                    <span>New Folder</span>
                  </ContextMenu.Item>
                )}

                {/* Separator */}
                {(onCreateFile || onCreateFolder) && onRefresh && (
                  <ContextMenu.Separator className="my-1 h-px bg-border" />
                )}

                {/* Refresh */}
                {onRefresh && (
                  <ContextMenu.Item
                    className={cn(
                      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    )}
                    onClick={onRefresh}
                  >
                    <ArrowClockwiseIcon className="size-4" weight="duotone" />
                    <span>Refresh</span>
                  </ContextMenu.Item>
                )}
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>
      </ScrollArea>
    </div>
  );
}

export function FileExplorer({
  entries,
  onFileClick,
  className,
  query,
  threadId,
  emptyState,
  errorState,
  showSearch = true,
  searchPlaceholder = "Search files...",
  showLines = true,
  indent = 20,
  animateExpand = true,
}: FileExplorerProps) {
  const { orpc } = useAgentStartContext();

  // If entries provided directly, use them; otherwise fetch via API
  const {
    data: fetchedEntries,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...orpc.sandbox.list.queryOptions({
      input: {
        path: query?.path || "/",
        recursive: query?.recursive || false,
        ignore: query?.ignore,
        threadId,
      },
    }),
    enabled: !entries, // Only fetch if entries not provided
  });

  // Use provided entries or fetched entries
  const effectiveEntries = entries || fetchedEntries || [];

  // Rename mutation
  const renameMutation = useMutation(
    orpc.sandbox.rename.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  // Delete mutation
  const deleteMutation = useMutation(
    orpc.sandbox.delete.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  // Create file mutation
  const createFileMutation = useMutation(
    orpc.sandbox.createFile.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  // Create folder mutation
  const createFolderMutation = useMutation(
    orpc.sandbox.createFolder.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  // Download mutation
  const downloadMutation = useMutation(
    orpc.sandbox.download.mutationOptions({
      onSuccess: (data) => {
        // Create a blob and trigger download
        const blob = new Blob([data.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    }),
  );

  const handleRename = (node: FileNode, newName: string) => {
    renameMutation.mutate({ path: node.path, newName });
  };

  const handleDelete = (node: FileNode) => {
    deleteMutation.mutate({ path: node.path });
  };

  const handleCreateFile = (parentNode: FileNode) => {
    const fileName = window.prompt("Enter file name:");
    if (fileName) {
      const newPath = `${parentNode.path}/${fileName}`;
      createFileMutation.mutate({ path: newPath, content: "" });
    }
  };

  const handleCreateFolder = (parentNode: FileNode) => {
    const folderName = window.prompt("Enter folder name:");
    if (folderName) {
      const newPath = `${parentNode.path}/${folderName}`;
      createFolderMutation.mutate({ path: newPath });
    }
  };

  const handleDownload = (node: FileNode) => {
    downloadMutation.mutate({ path: node.path });
  };

  const handleRefresh = () => {
    refetch();
  };

  // Default empty state
  const defaultEmptyState = (
    <Empty>
      <EmptyMedia>
        <EmptyIcon className="size-12" weight="duotone" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No files found</EmptyTitle>
        <EmptyDescription>
          The directory is empty or no files match your search.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  // Default error state
  const defaultErrorState = (err: Error, retry: () => void) => (
    <Empty>
      <EmptyMedia>
        <WarningCircleIcon
          className="size-12 text-destructive"
          weight="duotone"
        />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Failed to load files</EmptyTitle>
        <EmptyDescription>{err.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={retry} variant="outline">
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <FileTreeProvider>
        {isLoading && !entries ? (
          <div className="p-4">
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
          </div>
        ) : isError && !entries ? (
          <div className="flex h-full items-center justify-center p-4">
            {errorState
              ? errorState(error as Error, refetch)
              : defaultErrorState(error as Error, refetch)}
          </div>
        ) : effectiveEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            {emptyState || defaultEmptyState}
          </div>
        ) : (
          <>
            <FileExplorerInitializer entries={effectiveEntries} />
            <FileExplorerContent
              onFileClick={onFileClick}
              onRename={handleRename}
              onDelete={handleDelete}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDownload={handleDownload}
              onRefresh={handleRefresh}
              showSearch={showSearch}
              searchPlaceholder={searchPlaceholder}
              showLines={showLines}
              indent={indent}
              animateExpand={animateExpand}
            />
          </>
        )}
      </FileTreeProvider>
    </div>
  );
}

/** Helper component to initialize file tree data */
function FileExplorerInitializer({ entries }: { entries: FileNode[] }) {
  const { setFileTree } = useFileTree();

  // Initialize file tree when entries change
  useEffect(() => {
    if (entries.length > 0) {
      setFileTree(entries);
    }
  }, [entries, setFileTree]);

  return null;
}

// ============================================================================
// File Badge Component
// ============================================================================

interface FileBadgeProps {
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
  additions: number;
  deletions: number;
}

function FileBadge({ status, additions, deletions }: FileBadgeProps) {
  // Only show if there are actual changes
  if (additions === 0 && deletions === 0 && status === "untracked") {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* Show additions */}
      {additions > 0 && (
        <Badge
          variant="success"
          size="sm"
          className="bg-green-500/10 font-mono"
        >
          +{additions}
        </Badge>
      )}

      {/* Show deletions */}
      {deletions > 0 && (
        <Badge variant="error" size="sm" className="font-mono">
          -{deletions}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// File Tree Node Component
// ============================================================================

export interface FileTreeNodeProps {
  node: FileNode;
  level?: number;
  onFileClick?: (node: FileNode) => void;
  onRename?: (node: FileNode, newName: string) => void | Promise<void>;
  onDelete?: (node: FileNode) => void | Promise<void>;
  onCreateFile?: (node: FileNode) => void | Promise<void>;
  onCreateFolder?: (node: FileNode) => void | Promise<void>;
  onDownload?: (node: FileNode) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  isLast?: boolean;
  parentPath?: boolean[];
  showLines?: boolean;
  indent?: number;
  animateExpand?: boolean;
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  level = 0,
  onFileClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onDownload,
  onRefresh,
  isLast = false,
  parentPath = [],
  showLines = true,
  indent = 20,
  animateExpand = true,
}: FileTreeNodeProps) {
  const { expandedPaths, selectedPath, toggleExpanded, setSelectedPath } =
    useFileTree();

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.size > 0;
  const currentPath = [...parentPath, isLast];

  const handleClick = () => {
    if (node.isDirectory) {
      toggleExpanded(node.path);
    } else {
      setSelectedPath(node.path);
      onFileClick?.(node);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(node.path);
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  };

  const handleRename = () => {
    const newName = window.prompt("Enter new name:", node.name);
    if (newName && newName !== node.name) {
      onRename?.(node, newName);
    }
  };

  const handleDelete = () => {
    const confirmMessage = node.isDirectory
      ? `Are you sure you want to delete the folder "${node.name}" and all its contents?`
      : `Are you sure you want to delete "${node.name}"?`;

    if (window.confirm(confirmMessage)) {
      onDelete?.(node);
    }
  };

  return (
    <div>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <motion.div
            role="button"
            tabIndex={0}
            className={cn(
              "relative flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-all duration-200 hover:bg-accent/50",
              isSelected && "bg-accent/80",
            )}
            style={{ paddingLeft: `${level * indent + 8}px` }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            whileTap={{ scale: 0.98, transition: { duration: 0.06 } }}
          >
            {/* Tree Lines */}
            {showLines && level > 0 && (
              <div className="pointer-events-none absolute top-0 bottom-0 left-0">
                {currentPath.map((isLastInPath, pathIndex) => (
                  <div
                    key={pathIndex}
                    className="absolute top-0 bottom-0 border-border/40 border-l"
                    style={{
                      left: pathIndex * indent + 12,
                      display:
                        pathIndex === currentPath.length - 1 && isLastInPath
                          ? "none"
                          : "block",
                    }}
                  />
                ))}
                <div
                  className="absolute top-1/2 border-border/40 border-t"
                  style={{
                    left: (level - 1) * indent + 12,
                    width: indent - 4,
                    transform: "translateY(-1px)",
                  }}
                />
                {isLast && (
                  <div
                    className="absolute top-0 border-border/40 border-l"
                    style={{
                      left: (level - 1) * indent + 12,
                      height: "50%",
                    }}
                  />
                )}
              </div>
            )}

            {/* Expand/collapse icon for directories */}
            <motion.div
              className="flex size-4 items-center justify-center"
              animate={{ rotate: node.isDirectory && isExpanded ? 90 : 0 }}
              transition={{ duration: 0.1, ease: "easeInOut" }}
            >
              {node.isDirectory ? (
                <CaretRightIcon className="size-3 text-muted-foreground" />
              ) : (
                <span className="w-4" />
              )}
            </motion.div>

            {/* File/folder icon with status indicator */}
            <div className="relative">
              <motion.div
                className="flex size-4 items-center justify-center text-muted-foreground"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.1 }}
              >
                {node.isDirectory ? (
                  isExpanded ? (
                    <FolderOpenIcon className="size-4" weight="duotone" />
                  ) : (
                    <FolderIcon className="size-4" weight="duotone" />
                  )
                ) : (
                  <FileIcon className="size-4" weight="duotone" />
                )}
              </motion.div>

              {/* Status indicator dot */}
              {node.changes && (
                <div
                  className={cn(
                    "-top-0.5 -right-0.5 absolute size-2 rounded-full border border-background",
                    node.changes.status === "added" && "bg-green-500",
                    node.changes.status === "modified" && "bg-orange-500",
                    node.changes.status === "deleted" && "bg-red-500",
                    node.changes.status === "renamed" && "bg-blue-500",
                    node.changes.status === "untracked" && "bg-gray-500",
                  )}
                />
              )}
            </div>

            {/* File/folder name */}
            <span
              className={cn(
                "flex-1 truncate transition-colors",
                isSelected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {node.name}
            </span>

            {/* Git change statistics */}
            {node.changes && (
              <FileBadge
                status={node.changes.status}
                additions={node.changes.additions}
                deletions={node.changes.deletions}
              />
            )}
          </motion.div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Positioner className="z-50" sideOffset={4}>
            <ContextMenu.Popup
              className={cn(
                "min-w-48 rounded-lg border bg-popover p-1 shadow-lg",
                "data-[state=closed]:animate-out data-[state=open]:animate-in",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              )}
            >
              {/* New File / New Folder for directories */}
              {node.isDirectory && onCreateFile && (
                <ContextMenu.Item
                  className={cn(
                    "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                  onClick={() => onCreateFile(node)}
                >
                  <FilePlusIcon className="size-4" weight="duotone" />
                  <span>New File</span>
                </ContextMenu.Item>
              )}

              {node.isDirectory && onCreateFolder && (
                <ContextMenu.Item
                  className={cn(
                    "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                  onClick={() => onCreateFolder(node)}
                >
                  <FolderPlusIcon className="size-4" weight="duotone" />
                  <span>New Folder</span>
                </ContextMenu.Item>
              )}

              {/* Download for files */}
              {node.isFile && onDownload && (
                <ContextMenu.Item
                  className={cn(
                    "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                  onClick={() => onDownload(node)}
                >
                  <DownloadIcon className="size-4" weight="duotone" />
                  <span>Download</span>
                </ContextMenu.Item>
              )}

              {/* Separator after directory/file specific actions */}
              {((node.isDirectory && (onCreateFile || onCreateFolder)) ||
                (node.isFile && onDownload)) && (
                <ContextMenu.Separator className="my-1 h-px bg-border" />
              )}

              {/* Rename */}
              {onRename && (
                <ContextMenu.Item
                  className={cn(
                    "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                  onClick={handleRename}
                >
                  <PencilSimpleIcon className="size-4" weight="duotone" />
                  <span>Rename</span>
                </ContextMenu.Item>
              )}

              {/* Delete */}
              {onDelete && (
                <ContextMenu.Item
                  className={cn(
                    "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                  onClick={handleDelete}
                >
                  <TrashIcon className="size-4" weight="duotone" />
                  <span>Delete</span>
                </ContextMenu.Item>
              )}

              {/* Separator before utility actions */}
              {(onRename || onDelete) && (
                <ContextMenu.Separator className="my-1 h-px bg-border" />
              )}

              {/* Copy Path */}
              <ContextMenu.Item
                className={cn(
                  "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                  "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                )}
                onClick={handleCopyPath}
              >
                <CopyIcon className="size-4" weight="duotone" />
                <span>Copy Path</span>
              </ContextMenu.Item>

              {/* Refresh */}
              {onRefresh && (
                <ContextMenu.Item
                  className={cn(
                    "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                  onClick={onRefresh}
                >
                  <ArrowClockwiseIcon className="size-4" weight="duotone" />
                  <span>Refresh</span>
                </ContextMenu.Item>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {/* Render children if directory is expanded */}
      <AnimatePresence>
        {node.isDirectory && isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: animateExpand ? 0.15 : 0,
              ease: "easeInOut",
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              exit={{ y: -10 }}
              transition={{
                duration: animateExpand ? 0.1 : 0,
                delay: animateExpand ? 0.05 : 0,
              }}
            >
              {Array.from(node.children!.values()).map((child, index) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  level={level + 1}
                  onFileClick={onFileClick}
                  onRename={onRename}
                  onDelete={onDelete}
                  onCreateFile={onCreateFile}
                  onCreateFolder={onCreateFolder}
                  onDownload={onDownload}
                  onRefresh={onRefresh}
                  isLast={index === node.children!.size - 1}
                  parentPath={currentPath}
                  showLines={showLines}
                  indent={indent}
                  animateExpand={animateExpand}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

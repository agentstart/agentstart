/* agent-frontmatter:start
AGENT: Development tools page demonstrating DB and TanStack Query usage
PURPOSE: Interactive demo of CRUD operations with optimistic updates
FEATURES:
  - User list with pagination, search, and filtering
  - Create, edit, delete operations with optimistic UI
  - Real-time statistics and aggregations
  - Demo data seeding
SEARCHABLE: dev page, crud demo, tanstack query example, database demo
agent-frontmatter:end */

"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { User } from "better-auth";
import {
  CheckCircle,
  Clock,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/lib/orpc";

// Type definitions
type ListUsersOutput = Awaited<ReturnType<(typeof orpc.dev.listUsers)["call"]>>; // Will be inferred from oRPC response

const loadingRowKeys = Array.from(
  { length: 5 },
  (_, index) => `user-loading-row-${index}`,
);

export default function DevPage() {
  const queryClient = useQueryClient();

  // State for filters and pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "createdAt">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // State for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    image: "",
  });

  // Common query key for listUsers
  const listUsersQueryKey = orpc.dev.listUsers.queryKey({
    input: {
      page,
      limit: 10,
      search,
      verified: verifiedFilter,
      sortBy,
      sortOrder,
    },
  });

  // oRPC Queries
  const { data: usersData, isLoading: isLoadingUsers } = useQuery(
    orpc.dev.listUsers.queryOptions({
      input: {
        page,
        limit: 10,
        search,
        verified: verifiedFilter,
        sortBy,
        sortOrder,
      },
      // Refetch every 30 seconds for real-time feel
      refetchInterval: 30000,
      // Keep previous data while fetching new data
      placeholderData: keepPreviousData,
    }),
  );

  const { data: stats, isLoading: isLoadingStats } = useQuery(
    orpc.dev.getStats.queryOptions({
      refetchInterval: 10000, // Refetch stats every 10 seconds
    }),
  );

  // oRPC Mutations with optimistic updates
  const createUserMutation = useMutation(
    orpc.dev.createUser.mutationOptions({
      onMutate: async (newUser) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: listUsersQueryKey,
        });

        // Snapshot previous value
        const previousUsers = queryClient.getQueryData(listUsersQueryKey);

        // Optimistically update
        queryClient.setQueryData(
          listUsersQueryKey,
          (old: ListUsersOutput | undefined) => {
            if (!old) return old;
            return {
              ...old,
              users: [
                {
                  ...newUser,
                  image: newUser.image || null,
                  id: `temp-${Date.now()}`,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  emailVerified: false,
                },
                ...old.users,
              ],
            };
          },
        );

        return { previousUsers };
      },
      onError: (err, _newUser, context) => {
        // Rollback on error
        queryClient.setQueryData(listUsersQueryKey, context?.previousUsers);
        toast.error(err.message);
      },
      onSuccess: () => {
        toast.success("User created successfully");
        setCreateDialogOpen(false);
        setFormData({ name: "", email: "", image: "" });
      },
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries({
          queryKey: listUsersQueryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.dev.getStats.queryKey(),
        });
      },
    }),
  );

  const updateUserMutation = useMutation(
    orpc.dev.updateUser.mutationOptions({
      onMutate: async (updatedUser) => {
        await queryClient.cancelQueries({
          queryKey: listUsersQueryKey,
        });
        const previousUsers = queryClient.getQueryData(listUsersQueryKey);

        queryClient.setQueryData(
          listUsersQueryKey,
          (old: ListUsersOutput | undefined) => {
            if (!old) return old;
            return {
              ...old,
              users: old.users.map((user) =>
                user.id === updatedUser.id ? { ...user, ...updatedUser } : user,
              ),
            };
          },
        );

        return { previousUsers };
      },
      onError: (err, _updatedUser, context) => {
        queryClient.setQueryData(listUsersQueryKey, context?.previousUsers);
        toast.error(err.message);
      },
      onSuccess: () => {
        toast.success("User updated successfully");
        setEditDialogOpen(false);
        setSelectedUser(null);
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: listUsersQueryKey,
        });
      },
    }),
  );

  const deleteUserMutation = useMutation(
    orpc.dev.deleteUser.mutationOptions({
      onMutate: async (deletedUser) => {
        await queryClient.cancelQueries({
          queryKey: listUsersQueryKey,
        });
        const previousUsers = queryClient.getQueryData(listUsersQueryKey);

        queryClient.setQueryData(
          listUsersQueryKey,
          (old: ListUsersOutput | undefined) => {
            if (!old) return old;
            return {
              ...old,
              users: old.users.filter((user) => user.id !== deletedUser.id),
            };
          },
        );

        return { previousUsers };
      },
      onError: (err, _deletedUser, context) => {
        queryClient.setQueryData(listUsersQueryKey, context?.previousUsers);
        toast.error(err.message);
      },
      onSuccess: () => {
        toast.success("User deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedUser(null);
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: listUsersQueryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.dev.getStats.queryKey(),
        });
      },
    }),
  );

  const deleteUsersMutation = useMutation(
    orpc.dev.deleteUsers.mutationOptions({
      onMutate: async (payload) => {
        await queryClient.cancelQueries({
          queryKey: listUsersQueryKey,
        });
        const previousUsers = queryClient.getQueryData(listUsersQueryKey);

        queryClient.setQueryData(
          listUsersQueryKey,
          (old: ListUsersOutput | undefined) => {
            if (!old) return old;
            return {
              ...old,
              users: old.users.filter((user) => !payload.ids.includes(user.id)),
            };
          },
        );

        return { previousUsers };
      },
      onError: (err, _payload, context) => {
        queryClient.setQueryData(listUsersQueryKey, context?.previousUsers);
        toast.error(err.message);
      },
      onSuccess: (data) => {
        toast.success(`Deleted ${data.deleted} users`);
        setSelectedUsers(new Set());
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: listUsersQueryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.dev.getStats.queryKey(),
        });
      },
    }),
  );

  const seedDataMutation = useMutation(
    orpc.dev.seedDemoData.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const clearDataMutation = useMutation(
    orpc.dev.clearDemoData.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries();
        setSelectedUsers(new Set());
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  // Computed values
  const totalPages = usersData?.pagination.totalPages ?? 0;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Event handlers
  const handleCreateUser = () => {
    createUserMutation.mutate(formData);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      ...formData,
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate({ id: selectedUser.id });
  };

  const handleBatchDelete = () => {
    if (selectedUsers.size === 0) return;
    deleteUsersMutation.mutate({ ids: Array.from(selectedUsers) });
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === usersData?.users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(usersData?.users.map((u) => u.id) ?? []));
    }
  };

  const handleVerifiedFilterChange = (value: string) => {
    setVerifiedFilter(value as "all" | "verified" | "unverified");
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value as "name" | "email" | "createdAt");
  };

  return (
    <div className="container mx-auto space-y-6 px-6 py-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Development Dashboard</h1>
        <p className="text-muted-foreground">
          Demonstrating DB operations with TanStack Query
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (stats?.totalUsers ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              +{stats?.lastWeekUsers ?? 0} from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (stats?.totalVerified ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Email verified users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Query Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {queryClient.isFetching() > 0 ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching
                </div>
              ) : (
                "Idle"
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {queryClient.isFetching()} active queries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="query-demo">Query Examples</TabsTrigger>
          <TabsTrigger value="tools">Developer Tools</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={verifiedFilter}
                onValueChange={handleVerifiedFilterChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleSortByChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="createdAt">Created</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
            <div className="flex gap-2">
              {selectedUsers.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={deleteUsersMutation.isPending}
                >
                  {deleteUsersMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete {selectedUsers.size} Selected
                </Button>
              )}
              <Dialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to demonstrate optimistic updates
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="image">Avatar URL (optional)</Label>
                      <Input
                        id="image"
                        value={formData.image}
                        onChange={(e) =>
                          setFormData({ ...formData, image: e.target.value })
                        }
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={createUserMutation.isPending}
                    >
                      {createUserMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Users Table */}
          <Card className="p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedUsers.size === usersData?.users.length &&
                          usersData?.users.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUsers ? (
                    loadingRowKeys.map((loadingKey) => (
                      <TableRow key={loadingKey}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-12 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : usersData?.users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center">
                        No users found. Try seeding some demo data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersData?.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback>
                                {user.name?.slice(0, 2).toUpperCase() ?? "??"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.emailVerified ? "default" : "outline"}
                          >
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setFormData({
                                  name: user.name ?? "",
                                  email: user.email,
                                  image: user.image ?? "",
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Page {page} of {totalPages} • Total{" "}
                {usersData?.pagination.total} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Query Examples Tab */}
        <TabsContent value="query-demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>TanStack Query Features</CardTitle>
              <CardDescription>
                Demonstrating key features of TanStack Query with oRPC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">🔄 Optimistic Updates</h3>
                <p className="mb-2 text-muted-foreground text-sm">
                  UI updates immediately before server confirmation
                </p>
                <code className="block rounded bg-muted p-2 text-xs">
                  {`// See create/update/delete mutations above`}
                </code>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">⏱️ Auto Refetch</h3>
                <p className="mb-2 text-muted-foreground text-sm">
                  Data refreshes automatically at intervals
                </p>
                <code className="block rounded bg-muted p-2 text-xs">
                  {`refetchInterval: 30000 // Refetch every 30 seconds`}
                </code>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">📄 Pagination</h3>
                <p className="mb-2 text-muted-foreground text-sm">
                  Keep previous data while loading next page
                </p>
                <code className="block rounded bg-muted p-2 text-xs">
                  {`placeholderData: keepPreviousData // Smooth pagination`}
                </code>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">🎯 Query Invalidation</h3>
                <p className="mb-2 text-muted-foreground text-sm">
                  Selective cache invalidation after mutations
                </p>
                <code className="block rounded bg-muted p-2 text-xs">
                  {`queryClient.invalidateQueries({ queryKey: orpc.dev.listUsers.queryKey() })`}
                </code>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">📊 Query Status</h3>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="font-medium">Active Queries:</span>{" "}
                    {queryClient.isFetching()}
                  </div>
                  <div>
                    <span className="font-medium">Cached Queries:</span>{" "}
                    {queryClient.getQueryCache().getAll().length}
                  </div>
                  <div>
                    <span className="font-medium">Mutations:</span>{" "}
                    {queryClient.isMutating()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Developer Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tools</CardTitle>
              <CardDescription>
                Manage demo data and test database operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => seedDataMutation.mutate({ count: 20 })}
                  disabled={seedDataMutation.isPending}
                >
                  {seedDataMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Seed 20 Demo Users
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => clearDataMutation.mutate({})}
                  disabled={clearDataMutation.isPending}
                >
                  {clearDataMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash className="mr-2 h-4 w-4" />
                      Clear Demo Data
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    queryClient.invalidateQueries();
                    toast.success("All queries have been invalidated");
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Invalidate All Queries
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Query Cache Info</h4>
                <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(
                    {
                      activeQueries: queryClient.isFetching(),
                      activeMutations: queryClient.isMutating(),
                      cachedQueries: queryClient.getQueryCache().getAll()
                        .length,
                      queries: queryClient
                        .getQueryCache()
                        .getAll()
                        .map((q) => ({
                          queryKey: q.queryKey,
                          state: q.state.status,
                          dataUpdatedAt: new Date(
                            q.state.dataUpdatedAt,
                          ).toLocaleTimeString(),
                        })),
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information with optimistic updates
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-image">Avatar URL</Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

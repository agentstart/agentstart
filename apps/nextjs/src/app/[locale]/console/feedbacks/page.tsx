// AGENT: Feedback management dashboard page
// PURPOSE: View and manage user feedback submissions
// FEATURES:
//   - List all feedback entries
//   - Filter by status and topic
//   - Update feedback status
//   - Add admin responses
//   - View statistics
// USAGE: Navigate to /dashboard/feedback
// SEARCHABLE: feedback dashboard, feedback management, admin feedback

"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { FeedbackStats } from "./components/feedback-stats";
import { FeedbackFilters } from "./components/feedback-filters";
import { FeedbackList } from "./components/feedback-list";
import type {
  FeedbackStatus,
  FeedbackTopic,
} from "./components/feedback-filters";

export default function FeedbackDashboard() {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">(
    "all",
  );
  const [topicFilter, setTopicFilter] = useState<FeedbackTopic | "all">("all");
  const [page, setPage] = useState(0);
  const limit = 10;

  const queryClient = useQueryClient();

  // Fetch feedback list
  const { data, isLoading } = useQuery(
    orpc.feedback.list.queryOptions({
      input: {
        status: statusFilter === "all" ? undefined : statusFilter,
        topic: topicFilter === "all" ? undefined : topicFilter,
        limit,
        offset: page * limit,
      },
      placeholderData: keepPreviousData,
    }),
  );

  // Fetch statistics
  const { data: stats } = useQuery(
    orpc.feedback.stats.queryOptions({
      refetchInterval: 30000, // Refresh every 30 seconds
    }),
  );

  // Update feedback mutation
  const updateMutation = useMutation(
    orpc.feedback.update.mutationOptions({
      onSuccess: () => {
        toast.success("Feedback updated successfully");
        queryClient.invalidateQueries({
          queryKey: orpc.feedback.list.queryKey({
            input: {
              status: statusFilter === "all" ? undefined : statusFilter,
              topic: topicFilter === "all" ? undefined : topicFilter,
              limit,
              offset: page * limit,
            },
          }),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.feedback.stats.queryKey({}),
        });
      },
      onError: (error) => {
        toast.error("Failed to update feedback");
        console.error(error);
      },
    }),
  );

  const handleStatusUpdate = (id: string, status: FeedbackStatus) => {
    updateMutation.mutate({ id, status });
  };

  const handleResponseUpdate = (id: string, response: string) => {
    updateMutation.mutate({ id, response, status: "reviewed" });
  };

  return (
    <div className="container mx-auto space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">View and manage user feedback</p>
        </div>
      </div>

      <FeedbackStats stats={stats} />

      <FeedbackFilters
        statusFilter={statusFilter}
        topicFilter={topicFilter}
        onStatusChange={setStatusFilter}
        onTopicChange={setTopicFilter}
      />

      <FeedbackList
        data={data}
        isLoading={isLoading}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onStatusUpdate={handleStatusUpdate}
        onResponseUpdate={handleResponseUpdate}
      />
    </div>
  );
}

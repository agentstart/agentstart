/* agent-frontmatter:start
AGENT: Feedback filters component
PURPOSE: Filter feedback by status and topic
FEATURES:
  - Status filter dropdown
  - Topic filter dropdown
USAGE: <FeedbackFilters onStatusChange={} onTopicChange={} />
SEARCHABLE: feedback filters, filter component
agent-frontmatter:end */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FeedbackStatus = "pending" | "reviewed" | "resolved";
export type FeedbackTopic = "bug" | "feature" | "improvement" | "general";

interface FeedbackFiltersProps {
  statusFilter: FeedbackStatus | "all";
  topicFilter: FeedbackTopic | "all";
  onStatusChange: (status: FeedbackStatus | "all") => void;
  onTopicChange: (topic: FeedbackTopic | "all") => void;
}

export function FeedbackFilters({
  statusFilter,
  topicFilter,
  onStatusChange,
  onTopicChange,
}: FeedbackFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusChange(value as FeedbackStatus | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={topicFilter}
          onValueChange={(value) =>
            onTopicChange(value as FeedbackTopic | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

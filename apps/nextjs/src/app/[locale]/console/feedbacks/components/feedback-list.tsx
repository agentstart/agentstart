/* agent-frontmatter:start
AGENT: Feedback list component
PURPOSE: Display list of feedback items with pagination
FEATURES:
  - Display feedback items
  - Loading state
  - Empty state
  - Pagination controls
USAGE: <FeedbackList data={} isLoading={} onPageChange={} />
SEARCHABLE: feedback list, pagination component
agent-frontmatter:end */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedbackStatus } from "./feedback-filters";
import type { FeedbackItemData } from "./feedback-item";
import { FeedbackItem } from "./feedback-item";

const feedbackSkeletonKeys = [
  "feedback-skeleton-0",
  "feedback-skeleton-1",
  "feedback-skeleton-2",
  "feedback-skeleton-3",
  "feedback-skeleton-4",
] as const;

interface FeedbackListProps {
  data:
    | {
        items: FeedbackItemData[];
        totalCount: number;
        hasMore: boolean;
      }
    | undefined;
  isLoading: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onStatusUpdate: (id: string, status: FeedbackStatus) => void;
  onResponseUpdate: (id: string, response: string) => void;
}

export function FeedbackList({
  data,
  isLoading,
  page,
  limit,
  onPageChange,
  onStatusUpdate,
  onResponseUpdate,
}: FeedbackListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Entries</CardTitle>
        <CardDescription>
          {data?.totalCount
            ? `Showing ${data.items.length} of ${data.totalCount} entries`
            : "Loading..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {feedbackSkeletonKeys.map((key) => (
                <Skeleton key={key} className="h-32" />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No feedback found
            </div>
          ) : (
            <div className="space-y-4">
              {data?.items.map((feedback) => (
                <FeedbackItem
                  key={feedback.id}
                  feedback={feedback}
                  onStatusUpdate={onStatusUpdate}
                  onResponseUpdate={onResponseUpdate}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {data && data.totalCount > limit && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {page + 1} of {Math.ceil(data.totalCount / limit)}
            </span>
            <Button
              variant="outline"
              disabled={!data.hasMore}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

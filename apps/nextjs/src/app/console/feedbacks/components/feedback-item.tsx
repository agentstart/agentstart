// AGENT: Individual feedback item component
// PURPOSE: Display and manage a single feedback entry
// FEATURES:
//   - Display feedback content and metadata
//   - Update status
//   - Add/edit admin response
//   - Show mood indicator
// USAGE: <FeedbackItem feedback={} onStatusUpdate={} onResponseUpdate={} />
// SEARCHABLE: feedback item, feedback card

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Smile,
  Frown,
  Meh,
  Heart,
} from "lucide-react";
import type { FeedbackStatus, FeedbackTopic } from "./feedback-filters";

export type FeedbackMood = "happy" | "satisfied" | "unsatisfied" | "sad";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-500", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-green-500", icon: CheckCircle },
};

const topicConfig = {
  bug: { label: "Bug", color: "destructive" },
  feature: { label: "Feature", color: "default" },
  improvement: { label: "Improvement", color: "secondary" },
  general: { label: "General", color: "outline" },
};

const moodIcons = {
  happy: Heart,
  satisfied: Smile,
  unsatisfied: Meh,
  sad: Frown,
};

interface FeedbackItemProps {
  feedback: {
    id: string;
    topic: FeedbackTopic;
    content: string;
    mood: FeedbackMood;
    status: FeedbackStatus;
    response?: string | null;
    userId?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  onStatusUpdate: (id: string, status: FeedbackStatus) => void;
  onResponseUpdate: (id: string, response: string) => void;
}

export function FeedbackItem({
  feedback,
  onStatusUpdate,
  onResponseUpdate,
}: FeedbackItemProps) {
  const [response, setResponse] = useState(feedback.response || "");
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);

  const MoodIcon = moodIcons[feedback.mood];
  const StatusIcon = statusConfig[feedback.status].icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={topicConfig[feedback.topic].color as any}>
                {topicConfig[feedback.topic].label}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig[feedback.status].label}
              </Badge>
              {MoodIcon && (
                <MoodIcon className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="text-muted-foreground text-xs">
              {new Date(feedback.createdAt).toLocaleString()}
              {feedback.userId && ` • User: ${feedback.userId.slice(0, 8)}...`}
            </div>
          </div>

          <div className="flex gap-2">
            <Select
              value={feedback.status}
              onValueChange={(value) =>
                onStatusUpdate(feedback.id, value as FeedbackStatus)
              }
            >
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm">{feedback.content}</p>

        {feedback.response && (
          <div className="bg-muted rounded-md p-3">
            <p className="mb-1 text-xs font-medium">Admin Response:</p>
            <p className="text-sm">{feedback.response}</p>
          </div>
        )}

        <Dialog
          open={isResponseDialogOpen}
          onOpenChange={setIsResponseDialogOpen}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {feedback.response ? "Edit Response" : "Add Response"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Response</DialogTitle>
              <DialogDescription>
                Provide a response to this feedback
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Your response..."
              className="min-h-[100px]"
            />
            <DialogFooter>
              <Button
                onClick={() => {
                  onResponseUpdate(feedback.id, response);
                  setIsResponseDialogOpen(false);
                }}
              >
                Save Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

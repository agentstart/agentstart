"use client";

// AGENT: Feedback form component
// PURPOSE: Render feedback submission form inside popover
// FEATURES:
//   - Topic selection dropdown
//   - Feedback content textarea
//   - Mood selector with emoji icons
//   - Markdown support indicator
// USAGE: Used inside FeedbackPopover component
// SEARCHABLE: feedback form, user feedback, feedback ui

import * as React from "react";
import { Smile, Meh, Frown, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

type FeedbackMood = "happy" | "satisfied" | "unsatisfied" | "sad";
type FeedbackTopic = "bug" | "feature" | "improvement" | "general";

interface FeedbackFormProps {
  onSuccess?: () => void;
  className?: string;
}

const moodIcons = [
  { value: "happy" as FeedbackMood, icon: Heart, label: "Happy" },
  { value: "satisfied" as FeedbackMood, icon: Smile, label: "Satisfied" },
  { value: "unsatisfied" as FeedbackMood, icon: Meh, label: "Unsatisfied" },
  { value: "sad" as FeedbackMood, icon: Frown, label: "Sad" },
];

const topicOptions = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "improvement", label: "Improvement" },
  { value: "general", label: "General Feedback" },
];

export function FeedbackForm({ onSuccess, className }: FeedbackFormProps) {
  const [topic, setTopic] = React.useState<FeedbackTopic | "">("");
  const [content, setContent] = React.useState("");
  const [mood, setMood] = React.useState<FeedbackMood | null>(null);

  // Use TanStack Query mutation
  const submitFeedbackMutation = useMutation(
    orpc.feedback.submit.mutationOptions({
      onSuccess: () => {
        toast.success("Thank you for your feedback!");
        // Reset form
        setTopic("");
        setContent("");
        setMood(null);
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to submit feedback:", error);
        toast.error("Failed to submit feedback. Please try again.");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic || !content.trim() || !mood) {
      toast.error("Please fill in all fields");
      return;
    }

    submitFeedbackMutation.mutate({
      topic: topic,
      content: content.trim(),
      mood,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {/* Topic Selector */}
      <div className="space-y-2">
        <Select
          value={topic}
          onValueChange={(value) => setTopic(value as FeedbackTopic)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a topic..." />
          </SelectTrigger>
          <SelectContent>
            {topicOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Textarea */}
      <div className="space-y-2">
        <Textarea
          placeholder="Your feedback..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] resize-none"
          maxLength={5000}
        />
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Markdown supported</span>
          <span>{content.length}/5000</span>
        </div>
      </div>

      {/* Mood Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {moodIcons.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(value)}
              className={cn(
                "hover:bg-muted rounded-full p-2 transition-all",
                mood === value && "bg-primary/10 text-primary",
              )}
              aria-label={label}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        <Button
          type="submit"
          disabled={
            submitFeedbackMutation.isPending ||
            !topic ||
            !content.trim() ||
            !mood
          }
          size="sm"
        >
          {submitFeedbackMutation.isPending ? "Sending..." : "Send"}
        </Button>
      </div>
    </form>
  );
}

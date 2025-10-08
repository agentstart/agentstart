"use client";

/* agent-frontmatter:start
AGENT: Feedback button with popover component
PURPOSE: Trigger button that opens feedback form in popover
FEATURES:
  - Floating action button or inline button
  - Popover with feedback form
  - Customizable position and style
USAGE: Place in layout or any page for feedback collection
SEARCHABLE: feedback button, feedback popover, user feedback ui
agent-frontmatter:end */

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FeedbackForm } from "./feedback-form";
import { cn } from "@/lib/utils";

interface FeedbackButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  position?: "fixed" | "relative";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function FeedbackButton({
  className,
  variant = "outline",
  size = "default",
  position = "relative",
  side = "top",
  align = "end",
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const buttonClasses = cn(
    position === "fixed" && [
      "fixed bottom-6 right-6 z-50",
      "shadow-lg hover:shadow-xl transition-shadow",
    ],
    className,
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={buttonClasses}
          aria-label="Send feedback"
        >
          {size !== "icon" && "Feedback"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[400px] p-0"
        sideOffset={8}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Send Feedback</h4>
            <p className="text-muted-foreground text-sm">
              We'd love to hear your thoughts!
            </p>
          </div>
          <FeedbackForm onSuccess={() => setIsOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

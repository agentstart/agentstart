/* agent-frontmatter:start
AGENT: Relative time display component
PURPOSE: Display human-readable relative timestamps with detailed tooltip
USAGE: <RelativeTime timestamp={timestamp} />
EXPORTS: RelativeTime, RelativeTimeProps
FEATURES:
  - Displays simple relative time in trigger (e.g., "2 days ago")
  - Shows detailed relative time in tooltip (e.g., "2 days, 12 hours ago")
  - Shows UTC and local timezone in tooltip on hover
  - Auto-updates every minute
  - Handles Date objects and Unix timestamps
SEARCHABLE: relative time, timestamp, time display, date formatting, timezone
agent-frontmatter:end */

"use client";

import { format, intervalToDuration } from "date-fns";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export type RelativeTimeProps = {
  /**
   * Custom element to render before the time
   */
  leading?: ReactNode;
  timestamp?: number | Date;
} & Omit<ComponentProps<typeof TooltipTrigger>, "children">;

/**
 * Calculate simple relative time (only the most significant unit)
 */
function formatSimpleRelativeTime(date: Date): string {
  const now = new Date();
  const duration = intervalToDuration({ start: date, end: now });

  // Return only the most significant time unit
  if (duration.years && duration.years > 0) {
    return `${duration.years} year${duration.years > 1 ? "s" : ""} ago`;
  }
  if (duration.months && duration.months > 0) {
    return `${duration.months} month${duration.months > 1 ? "s" : ""} ago`;
  }
  if (duration.days && duration.days > 0) {
    return `${duration.days} day${duration.days > 1 ? "s" : ""} ago`;
  }
  if (duration.hours && duration.hours > 0) {
    return `${duration.hours} hour${duration.hours > 1 ? "s" : ""} ago`;
  }
  if (duration.minutes && duration.minutes > 0) {
    return `${duration.minutes} minute${duration.minutes > 1 ? "s" : ""} ago`;
  }
  if (duration.seconds && duration.seconds > 0) {
    return `${duration.seconds} second${duration.seconds > 1 ? "s" : ""} ago`;
  }

  return "just now";
}

/**
 * Calculate detailed relative time using date-fns intervalToDuration
 */
function formatDetailedRelativeTime(date: Date): string {
  const now = new Date();
  const duration = intervalToDuration({ start: date, end: now });

  const parts: string[] = [];

  // Add up to 3 most significant time units
  if (duration.years && duration.years > 0) {
    parts.push(`${duration.years} year${duration.years > 1 ? "s" : ""}`);
  }
  if (duration.months && duration.months > 0 && parts.length < 3) {
    parts.push(`${duration.months} month${duration.months > 1 ? "s" : ""}`);
  }
  if (duration.days && duration.days > 0 && parts.length < 3) {
    parts.push(`${duration.days} day${duration.days > 1 ? "s" : ""}`);
  }
  if (duration.hours && duration.hours > 0 && parts.length < 3) {
    parts.push(`${duration.hours} hour${duration.hours > 1 ? "s" : ""}`);
  }
  if (duration.minutes && duration.minutes > 0 && parts.length < 3) {
    parts.push(`${duration.minutes} minute${duration.minutes > 1 ? "s" : ""}`);
  }
  if (duration.seconds && duration.seconds > 0 && parts.length < 3) {
    parts.push(`${duration.seconds} second${duration.seconds > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? `${parts.join(", ")} ago` : "just now";
}

/**
 * Get timezone offset string (e.g., "GMT+8", "UTC")
 */
function getTimezoneString(): string {
  const offset = -new Date().getTimezoneOffset();
  if (offset === 0) return "UTC";

  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? "+" : "-";

  return `GMT${sign}${hours}${minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : ""}`;
}

export const RelativeTime = ({
  leading,
  timestamp,
  className,
  ...props
}: RelativeTimeProps) => {
  const [simpleRelativeTime, setSimpleRelativeTime] = useState<string>("");
  const [detailedRelativeTime, setDetailedRelativeTime] = useState<string>("");

  // Format detailed time info for tooltip
  const timeInfo = useMemo(() => {
    if (!timestamp) return null;

    const date = new Date(timestamp);
    const utcDate = format(date, "MMMM d, yyyy");
    const utcTime = format(date, "hh:mm:ss a");
    const localDate = format(date, "MMMM d, yyyy");
    const localTime = format(date, "hh:mm:ss a");
    const timezone = getTimezoneString();

    return {
      utcDate,
      utcTime,
      localDate,
      localTime,
      timezone,
    };
  }, [timestamp]);

  // Update relative times periodically
  useEffect(() => {
    if (!timestamp) {
      setSimpleRelativeTime("");
      setDetailedRelativeTime("");
      return;
    }

    const updateRelativeTimes = () => {
      const date = new Date(timestamp);
      setSimpleRelativeTime(formatSimpleRelativeTime(date));
      setDetailedRelativeTime(formatDetailedRelativeTime(date));
    };

    updateRelativeTimes();
    const interval = setInterval(updateRelativeTimes, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp || !simpleRelativeTime || !timeInfo) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={className ?? "cursor-default text-muted-foreground text-xs"}
        {...props}
      >
        {leading} {simpleRelativeTime}
      </TooltipTrigger>
      <TooltipPopup>
        <div className="space-y-2 text-xs">
          {/* Detailed relative time at the top */}
          <div className="text-left">{detailedRelativeTime}</div>

          {/* UTC and local timezone */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <Badge variant="secondary">UTC</Badge>
                <div>{timeInfo.utcDate}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">{timeInfo.utcTime}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{timeInfo.timezone}</Badge>
                <div>{timeInfo.localDate}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">
                  {timeInfo.localTime}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipPopup>
    </Tooltip>
  );
};

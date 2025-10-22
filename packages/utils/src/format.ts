/* agent-frontmatter:start
AGENT: Utility module
PURPOSE: Formats sizes, timestamps, and relative times for UI display.
USAGE: Use across dashboards or logs when presenting human-readable values.
EXPORTS: formatSize, formatDate, formatRelativeFromNow
FEATURES:
  - Converts bytes into human-friendly units
  - Formats relative times using Intl.RelativeTimeFormat
SEARCHABLE: packages, utils, src, format, date, size
agent-frontmatter:end */

/**
 * Format bytes into a human-readable string with appropriate units
 * @param bytes - The number of bytes to format
 * @returns A formatted string like "1.5M", "256K", "10B"
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

/**
 * Format a timestamp into a date string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns A formatted date string like "Dec 25 14:30" for recent dates or "Dec 25  2023" for older dates
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isRecent = now.getTime() - date.getTime() < 180 * 24 * 60 * 60 * 1000; // 6 months

  if (isRecent) {
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate().toString().padStart(2);
    const time = date
      .toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      })
      .substring(0, 5);
    return `${month} ${day} ${time}`;
  } else {
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate().toString().padStart(2);
    const year = date.getFullYear();
    return `${month} ${day}  ${year}`;
  }
}

const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
  style: "short",
});

const RELATIVE_TIME_UNITS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}> = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

const DEFAULT_RELATIVE_FALLBACK = "Just now";

/**
 * Format a Date-like input into a human-friendly relative time string
 * @param input - A date, ISO string, unix timestamp, or falsy value
 * @param fallbackText - Text to display when the input cannot be parsed
 */
export function formatRelativeFromNow(
  input: Date | string | number | null | undefined,
  fallbackText: string = DEFAULT_RELATIVE_FALLBACK,
): string {
  if (!input) {
    return fallbackText;
  }

  const date =
    input instanceof Date
      ? input
      : new Date(typeof input === "number" ? input : Date.parse(input));

  if (Number.isNaN(date.getTime())) {
    return fallbackText;
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);

  for (const { unit, seconds } of RELATIVE_TIME_UNITS) {
    if (Math.abs(diffInSeconds) >= seconds || unit === "second") {
      const value = Math.round(diffInSeconds / seconds);
      return RELATIVE_TIME_FORMAT.format(value, unit);
    }
  }

  return fallbackText;
}

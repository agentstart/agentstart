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

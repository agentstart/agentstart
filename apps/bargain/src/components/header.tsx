/* agent-frontmatter:start
AGENT: Bargain header component
PURPOSE: Display bargain app header with share functionality
USAGE: <BargainHeader />
EXPORTS: BargainHeader
FEATURES:
  - Static header text for bargain app
  - Share button with copy-to-clipboard functionality
  - Responsive layout
SEARCHABLE: bargain header, share button, header component
agent-frontmatter:end */

"use client";

import { ShareIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const handleShare = async () => {
    const url = `${window.location.protocol}//${window.location.host}`;

    // Try to use the Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: "归家十二分砍价守门员",
          url: url,
        });
      } catch (error) {
        // User cancelled the share, or share failed
        console.error("Share failed:", error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url);
        // You could add a toast notification here
        alert("链接已复制到剪贴板");
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  return (
    <header className="flex items-center justify-between gap-1 border-b bg-background px-6 py-3">
      <h1 className="font-semibold text-base">来和归家十二分砍价守门员聊聊</h1>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon-sm" onClick={handleShare}>
              <ShareIcon weight="duotone" className="size-4" />
            </Button>
          }
        />
        <TooltipContent>
          <span>分享</span>
        </TooltipContent>
      </Tooltip>
    </header>
  );
}

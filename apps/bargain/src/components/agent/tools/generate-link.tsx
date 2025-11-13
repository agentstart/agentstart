/* agent-frontmatter:start
AGENT: Generate Link tool UI component
PURPOSE: Display purchase link generation results with share functionality
USAGE: <GenerateLink part={toolPart} />
EXPORTS: GenerateLink, GenerateLinkProps
FEATURES:
  - Shows generated purchase link with price
  - Share button to create screenshot with QR code
  - Copy link functionality
  - Visual feedback for different states
SEARCHABLE: generate link tool, purchase link ui, share button
agent-frontmatter:end */

"use client";

import { ShareFatIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ExtendToolSet, ToolPart } from "agentstart/agent";
import { useState } from "react";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import type { generateLink } from "@/lib/tools/generate-link";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

// Extended tool set with generateLink
type ToolSet = ExtendToolSet<{
  generateLink: typeof generateLink;
}>;

// Extract the tool message type for generateLink
type GenerateLinkToolMessage = ToolPart<"generateLink", ToolSet>;

export interface GenerateLinkProps {
  part: GenerateLinkToolMessage;
}

export function GenerateLink({
  part: { state, input, output },
}: GenerateLinkProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const isLoading = ["input-streaming", "input-available"].includes(state);
  const isDone =
    state === "output-available" &&
    output &&
    ("status" in output ? output.status === "done" : false);
  const isError =
    state === "output-available" &&
    output &&
    ("status" in output ? output.status === "error" : false);

  const handleCopy = async () => {
    if (output && "url" in output && output.url) {
      try {
        await navigator.clipboard.writeText(output.url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };

  return (
    <>
      <Steps className="w-full max-w-full overflow-hidden" defaultOpen>
        <StepsItem>
          <StepsTrigger>
            <div className="flex w-full items-center gap-2">
              <span>生成购买链接</span>
            </div>
          </StepsTrigger>

          <StepsContent>
            {isLoading && (
              <div className="text-muted-foreground text-sm">
                正在生成购买链接...
              </div>
            )}

            {isDone && output && (
              <div className="space-y-2">
                {/* Price Display */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    最终价格:
                  </span>
                  <span className="font-bold text-lg text-orange-600">
                    ¥{"price" in output ? output.price : ""}
                  </span>
                </div>

                {/* Purchase Link */}
                {"url" in output && output.url && (
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-sm">
                      购买链接:
                    </span>
                    <Link
                      className="wrap-anywhere ml-1 font-medium text-primary underline"
                      to={output.url}
                      target="_blank"
                    >
                      {output.url}
                    </Link>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={!("price" in output) || !output.price}
                  >
                    <ShareFatIcon weight="duotone" className="size-4" />
                    分享砍价战果
                  </Button>
                </div>
              </div>
            )}

            {isError && output && "error" in output && (
              <div className="text-red-600 text-sm">
                {"error" in output ? output.error?.message : ""}
              </div>
            )}
          </StepsContent>
        </StepsItem>
      </Steps>

      {/* Share Dialog */}
      {output && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          price={"price" in output ? Number(output.price) || 0 : 0}
        />
      )}
    </>
  );
}

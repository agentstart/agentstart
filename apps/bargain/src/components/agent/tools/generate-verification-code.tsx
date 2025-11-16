/* agent-frontmatter:start
AGENT: Generate Verification Code tool UI component
PURPOSE: Display verification code generation results with share functionality
USAGE: <GenerateVerificationCode part={toolPart} />
EXPORTS: GenerateVerificationCode, GenerateVerificationCodeProps
FEATURES:
  - Shows generated verification code with price
  - Share button to create screenshot with QR code
  - Copy verification code functionality
  - Displays payment QR code image
  - Visual feedback for different states
SEARCHABLE: generate verification code, verification code ui, share button, payment qr
agent-frontmatter:end */

"use client";

import {
  ArchiveIcon,
  CheckIcon,
  CopyIcon,
  ShareFatIcon,
} from "@phosphor-icons/react";
import type { ExtendToolSet, ToolPart } from "agentstart/agent";
import { useRef, useState } from "react";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Fieldset } from "@/components/ui/fieldset";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { VerificationDialog } from "@/components/verification-dialog";
import type { generateVerificationCode } from "@/lib/tools/generate-verification-code";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

// Extended tool set with generateVerificationCode
type ToolSet = ExtendToolSet<{
  generateVerificationCode: typeof generateVerificationCode;
}>;

// Extract the tool message type for generateVerificationCode
type GenerateVerificationCodeToolMessage = ToolPart<
  "generateVerificationCode",
  ToolSet
>;

export interface GenerateVerificationCodeProps {
  part: GenerateVerificationCodeToolMessage;
}

export function GenerateVerificationCode({
  part: { state, output },
}: GenerateVerificationCodeProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] =
    useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const verificationCodeInputRef = useRef<HTMLInputElement>(null);

  const isLoading = ["input-streaming", "input-available"].includes(state);
  const isDone =
    state === "output-available" &&
    output &&
    (output.status ? output.status === "done" : false);
  const isError =
    state === "output-available" &&
    output &&
    (output.status ? output.status === "error" : false);

  const handleCopyCode = async () => {
    const code =
      verificationCodeInputRef.current?.value ??
      output?.metadata?.verificationCode;

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy verification code:", error);
    }
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };

  const handleSaveVerification = () => {
    setIsVerificationDialogOpen(true);
  };

  return (
    <>
      <Steps className="w-full max-w-full overflow-hidden" defaultOpen>
        <StepsItem>
          <StepsTrigger>
            <div className="flex w-full items-center gap-2">
              <span>生成核销码</span>
            </div>
          </StepsTrigger>

          <StepsContent>
            {isLoading && (
              <div className="text-muted-foreground text-sm">
                正在生成核销码...
              </div>
            )}

            {isDone && output?.metadata && (
              <Fieldset>
                {/* Price Display */}
                <Field>
                  <FieldLabel>当前价格</FieldLabel>
                  <span className="font-bold text-base text-orange-600">
                    ¥{output.metadata.price ?? ""}
                  </span>
                </Field>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveVerification}
                    disabled={
                      !output.metadata.verificationCode ||
                      !output.metadata.paymentImageUrl
                    }
                  >
                    <ArchiveIcon weight="duotone" className="size-4" />
                    去付款
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={!output.metadata.price}
                  >
                    <ShareFatIcon weight="duotone" className="size-4" />
                    分享砍价战果
                  </Button>
                </div>
              </Fieldset>
            )}

            {isError && output && output.error && (
              <div className="text-red-600 text-sm">
                {output.error?.message ?? ""}
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
          price={
            output?.metadata !== undefined
              ? Number(output.metadata.price) || 0
              : 0
          }
        />
      )}

      {output?.metadata?.verificationCode &&
        output?.metadata?.paymentImageUrl && (
          <VerificationDialog
            isOpen={isVerificationDialogOpen}
            onClose={() => setIsVerificationDialogOpen(false)}
            verificationCode={output.metadata.verificationCode}
            paymentImageUrl={output.metadata.paymentImageUrl}
          />
        )}
    </>
  );
}

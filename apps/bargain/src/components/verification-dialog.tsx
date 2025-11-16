/* agent-frontmatter:start
AGENT: Verification proof dialog component
PURPOSE: Generate downloadable screenshot of verification code and payment proof
USAGE: <VerificationDialog verificationCode="1234" paymentImageUrl="/pay.png" />
EXPORTS: VerificationDialog
FEATURES:
  - Displays verification code with payment screenshot
  - Generates downloadable proof image
  - Provides optional notes for merchant verification
SEARCHABLE: verification dialog, payment proof, download verification
agent-frontmatter:end */

"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Fieldset } from "@/components/ui/fieldset";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  verificationCode: string;
  paymentImageUrl: string;
}

export function VerificationDialog({
  isOpen,
  onClose,
  verificationCode,
  paymentImageUrl,
}: VerificationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const verificationCodeInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    if (!screenshotRef.current) {
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(screenshotRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `归家十二分-核销凭证-${verificationCode}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to generate verification screenshot:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    const code = verificationCodeInputRef.current?.value ?? verificationCode;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存核销凭证</DialogTitle>
          <DialogDescription>
            含核销码与付款码，扫码支付时输入核销码并保存凭证以便线下核销
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div ref={screenshotRef}>
            <Fieldset className="max-w-full">
              <Field>
                <FieldLabel>核销码</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    ref={verificationCodeInputRef}
                    type="text"
                    readOnly
                    value={verificationCode}
                    aria-label="核销码"
                  />
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-label="复制核销码"
                          onClick={handleCopyCode}
                        >
                          {copySuccess ? (
                            <CheckIcon weight="bold" className="size-4" />
                          ) : (
                            <>
                              <CopyIcon weight="bold" className="size-4" />
                              复制
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipPopup>
                        <p>{copySuccess ? "已复制" : "复制核销码"}</p>
                      </TooltipPopup>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  扫描付款码时输入此核销码完成支付，请妥善保存
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>付款二维码</FieldLabel>
                <div className="mb-4 w-full">
                  <img
                    src={paymentImageUrl}
                    alt="付款二维码"
                    className="max-w-[200px] object-contain"
                  />
                </div>
                <FieldDescription>
                  先扫码打开支付页，按提示输入上方核销码后完成付款
                </FieldDescription>
              </Field>

              <div className="rounded-lg bg-muted p-3 text-muted-foreground text-sm">
                <p className="mb-1 font-medium">使用说明:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>先使用付款二维码微信扫码进入支付页面</li>
                  <li>按提示输入上方核销码后完成支付</li>
                  <li>点击下方“保存图片”按钮生成凭证，线下核销时出示</li>
                  <li>核销码与您的砍价记录绑定</li>
                </ul>
              </div>
            </Fieldset>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? "生成中..." : "保存图片"}
            </Button>
            <Button onClick={onClose} variant="outline">
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

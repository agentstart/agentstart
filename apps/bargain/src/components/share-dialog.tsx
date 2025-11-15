/* agent-frontmatter:start
AGENT: Share dialog component
PURPOSE: Generate and share price screenshot with QR code
USAGE: <ShareDialog price={finalPrice} />
EXPORTS: ShareDialog
FEATURES:
  - Receives final bargained price from tool
  - Generates beautiful price display screenshot
  - Includes homepage QR code for sharing
  - Download screenshot functionality
SEARCHABLE: share dialog, screenshot, qr code, bargain share
agent-frontmatter:end */

"use client";

import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  price: number;
}

export function ShareDialog({ isOpen, onClose, price }: ShareDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const homeUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  useEffect(() => {
    if (!isOpen) return;

    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
  }, [isOpen]);

  const handleDownload = async () => {
    if (!screenshotRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(screenshotRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });

      // Download the image
      const link = document.createElement("a");
      link.download = `归家十二分-砍价成功-¥${price.toFixed(2)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to generate screenshot:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享你的砍价战果</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Screenshot Preview */}
          <div
            ref={screenshotRef}
            className="mx-auto w-full max-w-sm space-y-6 p-8"
          >
            {/* Logo/Header */}
            <div className="text-center">
              <h2 className="font-bold text-2xl text-foreground">
                归家十二分馄饨砍价挑战
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                来和 AI 聊天砍价，砍下低到尖叫的馄饨价💥
              </p>
            </div>

            {/* Price Display */}
            <div className="space-y-2 rounded-xl bg-accent p-6 text-center">
              <p className="font-medium text-muted-foreground text-sm">
                砍价成功！
              </p>
              <div className="font-bold text-5xl text-orange-600">
                ¥{price.toFixed(2)}
              </div>
            </div>

            {/* QR Code */}
            <div className="space-y-3 text-center">
              <div className="mx-auto inline-block rounded-lg bg-card p-4 shadow-sm">
                <QRCodeSVG value={homeUrl} size={140} level="H" />
              </div>
              <p className="text-muted-foreground text-xs">扫码参与砍价</p>
            </div>
          </div>

          {/* Action Buttons */}
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

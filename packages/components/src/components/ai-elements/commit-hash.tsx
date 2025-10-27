import { GitCommitIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CommitHashProps {
  hash: string | null;
  href: string;
}

export function CommitHash({ hash, href }: CommitHashProps) {
  if (!hash || !href) return null;

  const shortHash = hash.substring(0, 7);

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 gap-1 px-2 font-mono text-xs"
      render={
        <a
          href={href}
          target="_blank"
          title={`Commit: ${hash} (click to view on GitHub)`}
          rel="noreferrer"
        />
      }
    >
      <GitCommitIcon className="h-3 w-3" />
      {shortHash}
    </Button>
  );
}

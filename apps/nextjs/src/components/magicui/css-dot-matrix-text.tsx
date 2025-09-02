import { cn } from "@/lib/utils";

interface CssDotMatrixTextProps {
  children: string;
  className?: string;
}

export const CssDotMatrixText = ({
  children,
  className,
}: CssDotMatrixTextProps) => {
  return (
    <div
      className={cn("inline-block font-mono text-4xl", className)}
      style={{
        backgroundImage: `radial-gradient(circle, currentColor 25%, transparent 25%)`,
        backgroundSize: "4px 4px",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </div>
  );
};

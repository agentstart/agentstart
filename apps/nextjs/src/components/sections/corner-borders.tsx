import { cn } from "@/lib/utils";

interface CornerBordersProps {
  position?: "tl" | "tr" | "bl" | "br" | "all";
  className?: string;
  size?: number;
  thickness?: number;
}

export const CornerBorders = ({
  position = "all",
  className,
  size = 10,
  thickness = 2,
}: CornerBordersProps) => {
  const cornerStyles = {
    tl: {
      borderLeft: `${thickness}px solid`,
      borderTop: `${thickness}px solid`,
      transform: `translateY(-${thickness}px)`,
    },
    tr: {
      borderRight: `${thickness}px solid`,
      borderTop: `${thickness}px solid`,
      transform: `translateY(-${thickness}px)`,
    },
    bl: {
      borderLeft: `${thickness}px solid`,
      borderBottom: `${thickness}px solid`,
      transform: `translateY(${thickness}px)`,
    },
    br: {
      borderRight: `${thickness}px solid`,
      borderBottom: `${thickness}px solid`,
      transform: `translateY(${thickness}px)`,
    },
  };

  const positionClasses = {
    tl: "left-0 top-0",
    tr: "right-0 top-0",
    bl: "bottom-0 left-0",
    br: "bottom-0 right-0",
  };

  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderColor: "currentColor",
  };

  const positions =
    position === "all" ? (["tl", "tr", "bl", "br"] as const) : [position];

  return (
    <>
      {positions.map((pos) => (
        <div
          key={pos}
          className={cn(
            "text-foreground/20 pointer-events-none absolute z-10",
            positionClasses[pos],
            className,
          )}
          style={{ ...baseStyle, ...cornerStyles[pos] }}
        />
      ))}
    </>
  );
};

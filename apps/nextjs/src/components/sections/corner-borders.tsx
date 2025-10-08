/* agent-frontmatter:start
AGENT: Decorative corner borders component
PURPOSE: Add aesthetic corner borders to sections
USAGE: <CornerBorders position="all" size={10} thickness={1.5} />
PROPS:
  - position: Which corners to show (tl/tr/bl/br/all)
  - size: Size of corner borders in pixels
  - thickness: Border line thickness
  - className: Additional CSS classes
SEARCHABLE: corner borders, decorative borders, section decoration
agent-frontmatter:end */

import { cn } from "@/lib/utils";

interface CornerBordersProps {
  position?: "tl" | "tr" | "bl" | "br" | "all";
  className?: string;
  size?: number;
  thickness?: number;
}

/* agent-frontmatter:start
AGENT: Corner border decorations for visual enhancement
CUSTOMIZATION: Adjust size and thickness for different styles
agent-frontmatter:end */
export const CornerBorders = ({
  position = "all",
  className,
  size = 10,
  thickness = 1.5,
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
            "pointer-events-none absolute z-10 text-foreground/20",
            positionClasses[pos],
            className,
          )}
          style={{ ...baseStyle, ...cornerStyles[pos] }}
        />
      ))}
    </>
  );
};

"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useMemo } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";

const words = [
  "Accomplishing",
  "Actioning",
  "Actualizing",
  "Baking",
  "Booping",
  "Brewing",
  "Calculating",
  "Cerebrating",
  "Channelling",
  "Churning",
  "Clauding",
  "Coalescing",
  "Cogitating",
  "Computing",
  "Combobulating",
  "Concocting",
  "Considering",
  "Contemplating",
  "Cooking",
  "Crafting",
  "Creating",
  "Crunching",
  "Deciphering",
  "Deliberating",
  "Determining",
  "Discombobulating",
  "Doing",
  "Effecting",
  "Elucidating",
  "Enchanting",
  "Envisioning",
  "Finagling",
  "Flibbertigibbeting",
  "Forging",
  "Forming",
  "Frolicking",
  "Generating",
  "Germinating",
  "Hatching",
  "Herding",
  "Honking",
  "Ideating",
  "Imagining",
  "Incubating",
  "Inferring",
  "Manifesting",
  "Marinating",
  "Meandering",
  "Moseying",
  "Mulling",
  "Mustering",
  "Musing",
  "Noodling",
  "Percolating",
  "Perusing",
  "Philosophising",
  "Pontificating",
  "Pondering",
  "Processing",
  "Puttering",
  "Puzzling",
  "Reticulating",
  "Ruminating",
  "Scheming",
  "Schlepping",
  "Shimmying",
  "Simmering",
  "Smooshing",
  "Spelunking",
  "Spinning",
  "Stewing",
  "Sussing",
  "Synthesizing",
  "Thinking",
  "Tinkering",
  "Transmuting",
  "Unfurling",
  "Unravelling",
  "Vibing",
  "Wandering",
  "Whirring",
  "Wibbling",
  "Working",
  "Wrangling",
];

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
  },
  "blur-fade": {
    initial: { opacity: 0, filter: "blur(6px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(6px)" },
  },
};

interface StatusIndicatorsProps {
  prefix?: ReactNode;
  suffix?: ReactNode;
  text?: string;
  randomText?: boolean;
  shimmerDuration?: number;
  className?: string;
  fadeDuration?: number;
  variant?: "fade" | "slide" | "blur-fade";
}

export function StatusIndicators({
  prefix,
  suffix,
  text,
  randomText = true,
  shimmerDuration = 1,
  className,
  fadeDuration = 0.2,
  variant = "fade",
}: StatusIndicatorsProps) {
  const selected = animations[variant];

  const displayText = useMemo(() => {
    if (randomText) {
      const randomIndex = Math.floor(Math.random() * words.length);
      return `${words[randomIndex]}...`;
    }
    return text;
  }, [randomText, text]);

  return (
    <div className="relative flex h-8 items-center whitespace-nowrap">
      <AnimatePresence mode="wait">
        {displayText && (
          <motion.div
            key={displayText}
            initial={selected.initial}
            animate={selected.animate}
            exit={selected.exit}
            transition={{
              duration: fadeDuration,
              ease: "easeInOut",
            }}
            className="flex items-center gap-1.5 text-muted-foreground dark:text-[#666666]"
          >
            {prefix}
            <Shimmer className={className} duration={shimmerDuration}>
              {displayText || ""}
            </Shimmer>
            {suffix}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

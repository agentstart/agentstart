"use client";

import { motion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  forwardRef,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type LightRaysProps = Omit<ComponentProps<typeof motion.div>, "ref"> & {
  count?: number;
  blur?: number;
  speed?: number;
  length?: string;
};

const COLOR_SEQUENCE = [
  "rgba(255, 236, 50, 0.22)",
  "rgba(255, 193, 7, 0.2)",
  "rgba(255, 117, 79, 0.2)",
  "rgba(255, 102, 196, 0.18)",
  "rgba(150, 133, 255, 0.2)",
  "rgba(90, 195, 255, 0.18)",
  "rgba(146, 255, 200, 0.2)",
] as const;

type LightRay = {
  id: string;
  left: number;
  rotate: number;
  width: number;
  swing: number;
  delay: number;
  duration: number;
  intensity: number;
};

const createRays = (count: number, cycle: number): LightRay[] => {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const left = 8 + Math.random() * 84;
    const rotate = -28 + Math.random() * 56;
    const width = 160 + Math.random() * 160;
    const swing = 0.8 + Math.random() * 1.8;
    const delay = Math.random() * cycle;
    const duration = cycle * (0.75 + Math.random() * 0.5);
    const intensity = 0.6 + Math.random() * 0.5;

    return {
      id: `${index}-${Math.round(left * 10)}`,
      left,
      rotate,
      width,
      swing,
      delay,
      duration,
      intensity,
    };
  });
};

const Ray = ({
  left,
  rotate,
  width,
  swing,
  delay,
  duration,
  intensity,
}: LightRay) => {
  return (
    <motion.div
      className="-top-[12%] -translate-x-1/2 pointer-events-none absolute left-[var(--ray-left)] h-[var(--light-rays-length)] w-[var(--ray-width)] origin-top rounded-full bg-gradient-to-b from-[color-mix(in_srgb,var(--light-rays-color)_70%,transparent)] to-transparent opacity-0 mix-blend-screen blur-[var(--light-rays-blur)]"
      style={
        {
          "--ray-left": `${left}%`,
          "--ray-width": `${width}px`,
        } as CSSProperties
      }
      initial={{ rotate: rotate }}
      animate={{
        opacity: [0, intensity, 0],
        rotate: [rotate - swing, rotate + swing, rotate - swing],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
        repeatDelay: duration * 0.1,
      }}
    />
  );
};

export const LightRays = forwardRef<HTMLDivElement, LightRaysProps>(
  function LightRays(
    {
      className,
      style,
      count = 7,
      blur = 36,
      speed = 14,
      length = "70vh",
      ...props
    },
    ref,
  ) {
    const [rays, setRays] = useState<LightRay[]>([]);
    const [colorIndex, setColorIndex] = useState(0);
    const cycleDuration = Math.max(speed, 0.1);
    const colorTransitionSeconds = Math.max(speed * 0.8, 6);
    const activeColor = COLOR_SEQUENCE[colorIndex];

    useEffect(() => {
      setRays(createRays(count, cycleDuration));
    }, [count, cycleDuration]);

    useEffect(() => {
      const interval = window.setInterval(() => {
        setColorIndex((prev) => (prev + 1) % COLOR_SEQUENCE.length);
      }, colorTransitionSeconds * 1000);

      return () => {
        window.clearInterval(interval);
      };
    }, [colorTransitionSeconds]);

    return (
      <motion.div
        ref={ref}
        className={cn(
          "pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]",
          className,
        )}
        animate={{ "--light-rays-color": activeColor }}
        transition={{
          duration: colorTransitionSeconds * 0.75,
          ease: "easeInOut",
        }}
        style={
          {
            "--light-rays-color": activeColor,
            "--light-rays-blur": `${blur}px`,
            "--light-rays-length": length,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={
              {
                background:
                  "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--light-rays-color) 45%, transparent), transparent 70%)",
              } as CSSProperties
            }
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={
              {
                background:
                  "radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--light-rays-color) 35%, transparent), transparent 75%)",
              } as CSSProperties
            }
          />
          {rays.map((ray) => (
            <Ray key={ray.id} {...ray} />
          ))}
        </div>
      </motion.div>
    );
  },
);

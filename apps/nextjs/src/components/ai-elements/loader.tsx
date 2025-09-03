import { cn } from "@/lib/utils";

export function Loader({
  className,
  innerClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  innerClassName?: string;
}) {
  return (
    <div className={cn("relative block size-4", className)} {...props}>
      <div className="relative size-full">
        {[...Array.from({ length: 8 })].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute",
              "h-[8%] w-[24%]",
              "top-[46%] left-[38%]",
              "rounded-[20%] bg-white/80",
              "animate-spinner transition-colors",
              innerClassName,
            )}
            style={{
              transform: `rotate(${i * 45}deg) translate(146%)`,
              animationDelay: `${-0.7 + i * 0.087}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

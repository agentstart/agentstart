import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

export type ImageProps = Partial<Experimental_GeneratedImage> & {
  className?: string;
  alt?: string;
  src?: string;
};

export const Image = ({ src, base64, mediaType, ...props }: ImageProps) => (
  <img
    {...props}
    alt={props.alt}
    className={cn(
      "h-auto max-w-full overflow-hidden rounded-md",
      props.className,
    )}
    src={mediaType && base64 ? `data:${mediaType};base64,${base64}` : src}
  />
);

"use client";

import { CaretRightIcon, WarningCircleIcon } from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type StepsItemProps = React.ComponentProps<"div">;

export const StepsItem = ({
  children,
  className,
  ...props
}: StepsItemProps) => (
  <div className={cn("text-muted-foreground text-sm", className)} {...props}>
    {children}
  </div>
);

export type StepsTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  leftIcon?: React.ReactNode;
  swapIconOnHover?: boolean;
  loading?: boolean;
  error?: boolean;
};

export const StepsTrigger = ({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  loading = false,
  error = false,
  ...props
}: StepsTriggerProps) => {
  const iconNode = loading ? (
    <Spinner className="size-4 text-muted-foreground" />
  ) : error ? (
    <WarningCircleIcon weight="duotone" className="size-4 text-red-600" />
  ) : (
    leftIcon
  );
  const shouldSwapIconOnHover = swapIconOnHover && !loading && !error;

  return (
    <CollapsibleTrigger
      className={cn(
        "group/steps-trigger flex w-full cursor-pointer items-center justify-start gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground",
        className,
      )}
      aria-busy={loading || undefined}
      {...props}
    >
      <div className="flex w-full items-center gap-2">
        {iconNode ? (
          <span className="relative inline-flex size-4 items-center justify-center">
            <span
              className={cn(
                "transition-opacity",
                shouldSwapIconOnHover && "group-hover/steps-trigger:opacity-0",
              )}
            >
              {iconNode}
            </span>
            {shouldSwapIconOnHover && (
              <CaretRightIcon className="absolute size-4 opacity-0 transition-all group-hover/steps-trigger:opacity-100 group-data-panel-open/steps-trigger:rotate-90" />
            )}
          </span>
        ) : null}
        {children}
      </div>
      {!iconNode &&
        (loading ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : (
          <CaretRightIcon className="size-4 transition-transform group-data-panel-open/steps-trigger:rotate-90" />
        ))}
    </CollapsibleTrigger>
  );
};

export type StepsContentProps = React.ComponentProps<
  typeof CollapsibleContent
> & {
  bar?: React.ReactNode;
};

export const StepsContent = ({
  children,
  className,
  bar,
  ...props
}: StepsContentProps) => {
  return (
    <CollapsibleContent
      className={cn(
        "overflow-hidden text-popover-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className,
      )}
      {...props}
    >
      <ScrollArea className="mt-3 grid max-h-96 min-w-0 max-w-full grid-cols-[min-content_minmax(0,1fr)] items-start gap-x-3 overflow-y-auto">
        <div className="min-w-0 self-stretch">{bar ?? <StepsBar />}</div>
        <div className="min-w-0 space-y-2">{children}</div>
      </ScrollArea>
    </CollapsibleContent>
  );
};

export type StepsBarProps = React.HTMLAttributes<HTMLDivElement>;

export const StepsBar = ({ className, ...props }: StepsBarProps) => (
  <div
    className={cn("mr-2 ml-1.5 h-full w-[2px] bg-muted", className)}
    aria-hidden
    {...props}
  />
);

export type StepsProps = React.ComponentProps<typeof Collapsible>;

export function Steps({
  defaultOpen = false,
  className,
  ...props
}: StepsProps) {
  return (
    <Collapsible
      className={cn(className)}
      defaultOpen={defaultOpen}
      {...props}
    />
  );
}

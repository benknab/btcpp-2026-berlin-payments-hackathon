import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

function Skeleton({ className, ...props }: ComponentProps<"div">): ReactNode {
  return (
    <div data-slot="skeleton" className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} {...props} />
  );
}

export { Skeleton };

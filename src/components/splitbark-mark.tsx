import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SplitbarkMark({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={cn("size-12 shrink-0", className)} aria-hidden="true">
      <circle cx="32" cy="32" r="31" className="fill-secondary" />
      <path
        d="M18 12C7 10 4 23 9 37C11 42 18 37 23 28L25 15ZM46 12C57 10 60 23 55 37C53 42 46 37 41 28L39 15Z"
        className="fill-primary"
      />
      <path
        d="M32 10C20 10 15 20 15 32C15 46 22 55 32 55C42 55 49 46 49 32C49 20 44 10 32 10Z"
        className="fill-primary"
      />
      <path
        d="M32 15C27 22 29 30 24 35C19 40 24 49 32 49C40 49 45 40 40 35C35 30 37 22 32 15Z"
        className="fill-background"
      />
      <circle cx="23" cy="29" r="2.5" className="fill-background" />
      <circle cx="41" cy="29" r="2.5" className="fill-background" />
      <path d="M28 37C30 35 34 35 36 37C36 40 33 42 32 42C31 42 28 40 28 37Z" className="fill-primary" />
      <path d="M32 42V46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
      <circle cx="32" cy="54" r="8" className="fill-secondary" />
      <path
        d="M32 59V54L28 50M32 54L36 50M26 50H28V52M38 50H36V52"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  );
}

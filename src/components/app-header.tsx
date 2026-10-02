import { SplitbarkMark } from "@/components/splitbark-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppHeader(): ReactNode {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Splitbark home"
        >
          <SplitbarkMark className="size-10 sm:size-12" />
          <span className="font-heading text-2xl font-semibold tracking-tighter text-primary sm:text-3xl">
            splitbark
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="hidden sm:inline-flex">
            Mainnet
          </Badge>
          <Link to="/" className={buttonVariants({ variant: "ghost" })}>
            Your events
          </Link>
        </div>
      </div>
    </header>
  );
}

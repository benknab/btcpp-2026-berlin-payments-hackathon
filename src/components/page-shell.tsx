import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageShell({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ArrowUpRightIcon aria-hidden="true" className="size-5" />
          Berlin Pot
        </Link>
        <p className="text-xs text-muted-foreground">BTC++ · Berlin 2026</p>
      </header>
      {children}
      <footer className="mt-auto pt-6 text-xs text-muted-foreground">
        Shared expenses, without the awkward part. Hackathon prototype · Bark signet only. Never use real funds.
      </footer>
    </main>
  );
}

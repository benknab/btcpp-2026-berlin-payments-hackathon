import { AppHeader } from "@/components/app-header";
import type { ReactNode } from "react";

export function PageShell({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <div className="min-h-svh">
      <AppHeader />
      <main id="main-content" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-6 pb-24 sm:px-6 sm:pt-10">
        {children}
      </main>
    </div>
  );
}

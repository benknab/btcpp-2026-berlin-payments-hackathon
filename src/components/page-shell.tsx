import type { ReactNode } from "react";

export function PageShell({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">{children}</main>;
}

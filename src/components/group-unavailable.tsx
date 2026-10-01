import { PageShell } from "@/components/page-shell";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function GroupUnavailable(): ReactNode {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold">We couldn’t open this group</h1>
      <p className="text-muted-foreground">Check the invitation link, or try again if your connection dropped.</p>
      <Link to="/" className="underline underline-offset-4">
        Create a new group
      </Link>
    </PageShell>
  );
}

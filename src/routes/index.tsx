import { GroupCreateForm } from "@/components/group-create-form";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home(): ReactNode {
  return (
    <PageShell>
      <section className="flex flex-col gap-3 py-4">
        <p className="text-sm text-muted-foreground">Less math. More memories.</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Good times. Fair shares.</h1>
        <p className="max-w-lg text-muted-foreground">
          Split the weekend, not the friendship. Track what everyone paid and see exactly where you stand.
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
          <CardDescription>Start with a name and your people. We’ll handle the math.</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupCreateForm />
        </CardContent>
      </Card>
      <section className="flex flex-col gap-3">
        <Link to="/settle" className={buttonVariants({ variant: "outline", className: "self-start" })}>
          Open Bark settlement workspace
        </Link>
        <p className="text-xs text-muted-foreground">
          Manual signet workspace for standalone pots. For a group, use its own settlement page.
        </p>
      </section>
    </PageShell>
  );
}

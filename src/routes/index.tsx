import { EventCreateForm } from "@/components/event-create-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Create event" }] }),
  component: Home,
});

function Home(): ReactNode {
  return (
    <main className="mx-auto min-h-svh max-w-xl px-3 py-6 sm:px-6 sm:py-12">
      <Card className="gap-8 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-normal">Create event</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventCreateForm />
        </CardContent>
      </Card>
    </main>
  );
}

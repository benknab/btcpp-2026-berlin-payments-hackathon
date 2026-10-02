import { EventCreateForm } from "@/components/event-create-form";
import { SavedEvents } from "@/components/saved-events";
import { SectionCard } from "@/components/section-card";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Create event · Splitbark" }] }),
  component: Home,
});

function Home(): ReactNode {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-12">
      <SavedEvents />
      <SectionCard
        className="gap-8 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"
        title={<h1 className="text-3xl font-normal">Create event</h1>}
      >
        <EventCreateForm />
      </SectionCard>
    </main>
  );
}

import { EventCreateForm } from "@/components/event-create-form";
import { HomeIntroduction } from "@/components/home-introduction";
import { PageShell } from "@/components/page-shell";
import { SavedEvents } from "@/components/saved-events";
import { SectionCard } from "@/components/section-card";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Splitbark · Shared expenses with Bitcoin settlement" }] }),
  component: Home,
});

function Home(): ReactNode {
  return (
    <PageShell>
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <HomeIntroduction />
        <div className="flex min-w-0 flex-col gap-6">
          <SavedEvents />
          <SectionCard title={<h2 className="font-heading text-3xl font-medium tracking-tight">Create event</h2>}>
            <EventCreateForm />
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

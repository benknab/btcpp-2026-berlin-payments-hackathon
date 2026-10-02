import { EventCreateForm } from "@/components/event-create-form";
import { HomeIntroduction } from "@/components/home-introduction";
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
    <main className="mx-auto grid min-h-svh max-w-xl content-start items-start gap-8 px-3 py-6 sm:px-6 sm:py-12 lg:max-w-5xl lg:grid-cols-2 lg:gap-12">
      <HomeIntroduction />
      <div className="flex min-w-0 flex-col gap-6">
        <SavedEvents />
        <SectionCard
          className="gap-8 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"
          title={<h2 className="text-3xl font-normal">Create event</h2>}
        >
          <EventCreateForm />
        </SectionCard>
      </div>
    </main>
  );
}

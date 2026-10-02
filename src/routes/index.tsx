import { EventCreateForm } from "@/components/event-create-form";
import { SavedEvents } from "@/components/saved-events";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Splitbark · Shared expenses with Bitcoin settlement" }] }),
  component: Home,
});

function Home(): ReactNode {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-normal">Splitbark</h1>
          <a
            href="https://github.com/benknab/btcpp-2026-berlin-payments-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            GitHub
            <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
          </a>
        </div>
        <p className="text-muted-foreground">
          Track shared expenses, split costs, and settle up with Bitcoin using Lightning and Bark.
        </p>
        <p className="text-sm text-muted-foreground">Built for the bitcoin++ Berlin 2026 payments hackathon.</p>
      </header>
      <SavedEvents />
      <SectionCard
        className="gap-8 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"
        title={<h2 className="text-3xl font-normal">Create event</h2>}
      >
        <EventCreateForm />
      </SectionCard>
    </main>
  );
}

import { BrandIllustration } from "@/components/brand-illustration";
import { EventCreateForm } from "@/components/event-create-form";
import { PageShell } from "@/components/page-shell";
import { SavedEvents } from "@/components/saved-events";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRightIcon, BitcoinIcon } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Splitbark · Shared expenses with Bitcoin settlement" }] }),
  component: Home,
});

function Home(): ReactNode {
  return (
    <PageShell>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <SectionCard title={<h1 className="font-heading text-3xl font-medium tracking-tight">Create event</h1>}>
          <EventCreateForm />
        </SectionCard>
        <aside className="flex min-w-0 flex-col gap-5" aria-label="Your events">
          <div className="hidden md:block">
            <BrandIllustration />
          </div>
          <SavedEvents />
          <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <BitcoinIcon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Amounts in sats · Bitcoin settlement</span>
          </div>
        </aside>
      </div>
      <footer className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>Mainnet · Use small amounts with trusted participants.</span>
        <a
          href="https://github.com/benknab/btcpp-2026-berlin-payments-hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          GitHub
          <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
        </a>
      </footer>
    </PageShell>
  );
}

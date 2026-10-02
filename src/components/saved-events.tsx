import { ActionError } from "@/components/action-error";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { useSavedEvents } from "@/components/use-saved-events";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SavedEvents(): ReactNode {
  const { events, loading, error } = useSavedEvents();
  if (events.length === 0 && !loading && error === null) {
    return null;
  }
  return (
    <SectionCard title={<h2>Your events</h2>}>
      {loading && <output className="text-muted-foreground">Loading events…</output>}
      <ActionError message={error} />
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.inviteKey}>
            <Link
              to="/groups/$inviteKey"
              params={{ inviteKey: event.inviteKey }}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full justify-between")}
            >
              <span className="truncate">{event.name}</span>
              <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

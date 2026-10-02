import { ActionError } from "@/components/action-error";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedEvents } from "@/components/use-saved-events";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { CalendarDaysIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SavedEvents(): ReactNode {
  const { events, loading, error } = useSavedEvents();
  return (
    <SectionCard title={<h2>Your events</h2>} contentClassName="flex flex-col gap-3">
      {loading && (
        <output className="flex flex-col gap-2" aria-label="Loading events">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </output>
      )}
      <ActionError message={error} />
      {events.length === 0 && !loading && error === null && (
        <EmptyState title="No saved events" icon={CalendarDaysIcon} />
      )}
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

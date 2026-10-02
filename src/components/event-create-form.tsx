import { EventDetailsFields } from "@/components/event-details-fields";
import { Button } from "@/components/ui/button";
import { FieldError, FieldSet } from "@/components/ui/field";
import { useEventCreate } from "@/components/use-event-create";
import type { ReactNode } from "react";

export function EventCreateForm(): ReactNode {
  const creation = useEventCreate();
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        creation.submit(new FormData(event.currentTarget));
      }}
    >
      <FieldSet disabled={creation.pending} className="gap-6" aria-label="Create event">
        <EventDetailsFields />
        {creation.error !== null && <FieldError>{creation.error}</FieldError>}
        <Button type="submit" size="lg" className="h-12 self-start px-5" disabled={creation.pending}>
          {creation.pending ? "Creating…" : "Create event"}
        </Button>
      </FieldSet>
    </form>
  );
}

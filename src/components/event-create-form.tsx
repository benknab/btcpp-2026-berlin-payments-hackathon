import { EventDetailsFields } from "@/components/event-details-fields";
import { Button } from "@/components/ui/button";
import { FieldError, FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useEventCreate } from "@/components/use-event-create";
import { ArrowRightIcon } from "lucide-react";
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
        <Button type="submit" size="lg" className="w-full sm:w-auto sm:self-start" disabled={creation.pending}>
          {creation.pending && <Spinner data-icon="inline-start" />}
          {creation.pending ? "Creating…" : "Create event"}
          {!creation.pending && <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />}
        </Button>
      </FieldSet>
    </form>
  );
}

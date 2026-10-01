import { EventParticipants } from "@/components/event-participants";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEventCreate } from "@/components/use-event-create";
import { MAX_GROUP_NAME } from "@/domain/group-input";
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
        <FieldGroup className="gap-8">
          <Field>
            <FieldLabel htmlFor="event-name">Event name</FieldLabel>
            <Input
              id="event-name"
              name="eventName"
              placeholder="Weekend trip"
              className="h-12 px-4"
              required
              maxLength={MAX_GROUP_NAME}
            />
          </Field>
          <EventParticipants />
        </FieldGroup>
        {creation.error !== null && <FieldError>{creation.error}</FieldError>}
        <Button type="submit" size="lg" className="h-12 self-start px-5" disabled={creation.pending}>
          {creation.pending ? "Creating…" : "Create event"}
        </Button>
      </FieldSet>
    </form>
  );
}

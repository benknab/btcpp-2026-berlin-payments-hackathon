import { EventParticipants } from "@/components/event-participants";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";

export function EventCreateForm(): ReactNode {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FieldGroup className="gap-8">
        <Field>
          <FieldLabel htmlFor="event-name">Event name</FieldLabel>
          <Input id="event-name" placeholder="Weekend trip" className="h-12 px-4" />
        </Field>
        <EventParticipants />
      </FieldGroup>
      <Button type="button" size="lg" className="h-12 self-start px-5">
        Create event
      </Button>
    </form>
  );
}

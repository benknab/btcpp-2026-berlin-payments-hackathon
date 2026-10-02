import { EventParticipants } from "@/components/event-participants";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_GROUP_NAME } from "@/domain/group-input";
import type { ReactNode } from "react";

export function EventDetailsFields(): ReactNode {
  return <FieldGroup className="gap-8">
    <Field><FieldLabel htmlFor="event-name">Event name</FieldLabel><Input id="event-name" name="eventName" placeholder="Weekend trip" className="h-12 px-4" required maxLength={MAX_GROUP_NAME} /></Field>
    <EventParticipants />
  </FieldGroup>;
}

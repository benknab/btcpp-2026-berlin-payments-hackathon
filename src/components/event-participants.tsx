import { EventPersonFields } from "@/components/event-person-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_PARTICIPANT_NAME, MAX_PARTICIPANTS } from "@/domain/group-input";
import { PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

const INITIAL_PEOPLE = [0];
const FIRST_GUEST_NUMBER = 2;

export function EventParticipants(): ReactNode {
  const [people, setPeople] = useState(INITIAL_PEOPLE);
  const nextId = useRef(INITIAL_PEOPLE.length);

  function addPerson(): void {
    const id = nextId.current;
    nextId.current += 1;
    setPeople((current) => [...current, id]);
  }

  function removePerson(id: number): void {
    setPeople((current) => current.filter((person) => person !== id));
  }

  return (
    <FieldSet className="gap-6">
      <FieldLegend>Participants</FieldLegend>
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel htmlFor="your-name">You</FieldLabel>
          <Input
            id="your-name"
            name="organizerName"
            placeholder="Your name"
            autoComplete="given-name"
            className="h-12 px-4"
            required
            maxLength={MAX_PARTICIPANT_NAME}
          />
        </Field>
        {people.map((id, index) => (
          <EventPersonFields
            key={id}
            id={id}
            number={index + FIRST_GUEST_NUMBER}
            removable={index > 0}
            onRemove={removePerson}
          />
        ))}
      </FieldGroup>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="h-12 self-start px-5"
        onClick={addPerson}
        disabled={people.length >= MAX_PARTICIPANTS - 1}
      >
        <PlusIcon data-icon="inline-start" />
        Add person
      </Button>
    </FieldSet>
  );
}

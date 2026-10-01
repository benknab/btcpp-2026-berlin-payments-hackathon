import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { PlusIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

const INITIAL_PEOPLE = [0, 1];
const FIRST_GUEST_NUMBER = 2;

export function EventParticipants(): ReactNode {
  const [people, setPeople] = useState(INITIAL_PEOPLE);
  const nextId = useRef(INITIAL_PEOPLE.length);

  function addPerson(): void {
    const id = nextId.current;
    nextId.current += 1;
    setPeople((current) => [...current, id]);
  }

  return (
    <FieldSet className="gap-6">
      <FieldLegend>Participants</FieldLegend>
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel htmlFor="your-name">You</FieldLabel>
          <Input id="your-name" placeholder="Your name" autoComplete="given-name" className="h-12 px-4" />
        </Field>
        {people.map((id, index) => (
          <Field key={id}>
            <FieldLabel htmlFor={`person-${id}`}>Person {index + FIRST_GUEST_NUMBER}</FieldLabel>
            <InputGroup className="h-12">
              <InputGroupInput id={`person-${id}`} placeholder="Name" className="h-full px-4" />
              {index > 0 && (
                <InputGroupAddon align="inline-end" className="h-full py-0 pr-0 has-[>button]:mr-0">
                  <InputGroupButton
                    variant="secondary"
                    size="icon-sm"
                    className="h-full w-12 rounded-l-none border-l border-input"
                    aria-label={`Remove person ${index + FIRST_GUEST_NUMBER}`}
                    onClick={() => {
                      setPeople((current) => current.filter((person) => person !== id));
                    }}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </Field>
        ))}
      </FieldGroup>
      <Button type="button" variant="secondary" size="lg" className="h-12 self-start px-5" onClick={addPerson}>
        <PlusIcon data-icon="inline-start" />
        Add person
      </Button>
    </FieldSet>
  );
}

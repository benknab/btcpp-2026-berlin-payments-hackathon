import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PersonInput } from "@/components/use-group-create";
import { MAX_PARTICIPANT_NAME, MAX_PARTICIPANTS } from "@/domain/group-input";
import { PlusIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PeopleProps {
  readonly organizerName: string;
  readonly people: readonly PersonInput[];
  readonly pending: boolean;
  readonly setOrganizerName: (value: string) => void;
  readonly addPerson: () => void;
  readonly changePerson: (id: number, value: string) => void;
  readonly removePerson: (id: number) => void;
}

export function GroupPeopleFields(props: PeopleProps): ReactNode {
  return (
    <FieldSet disabled={props.pending}>
      <FieldLegend>Who’s in?</FieldLegend>
      <FieldDescription>No account needed. Everyone gets a share of the expenses.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="organizer-name">Your name</FieldLabel>
          <Input
            id="organizer-name"
            placeholder="Alice"
            value={props.organizerName}
            required
            maxLength={MAX_PARTICIPANT_NAME}
            autoComplete="given-name"
            onChange={(event) => {
              props.setOrganizerName(event.target.value);
            }}
          />
        </Field>
        {props.people.map((person, index) => (
          <Field key={person.id}>
            <FieldLabel htmlFor={`person-${person.id}`}>Person {index + 1}</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={`person-${person.id}`}
                placeholder="Friend’s name"
                value={person.name}
                required
                maxLength={MAX_PARTICIPANT_NAME}
                onChange={(event) => {
                  props.changePerson(person.id, event.target.value);
                }}
              />
              {props.people.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove person ${index + 1}`}
                  onClick={() => {
                    props.removePerson(person.id);
                  }}
                >
                  <XIcon data-icon="inline-start" />
                </Button>
              ) : null}
            </div>
          </Field>
        ))}
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => {
          props.addPerson();
        }}
        disabled={props.pending || props.people.length >= MAX_PARTICIPANTS - 1}
      >
        <PlusIcon data-icon="inline-start" /> Add another person
      </Button>
    </FieldSet>
  );
}

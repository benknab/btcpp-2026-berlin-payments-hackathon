import { GroupOrganizerField } from "@/components/group-organizer-field";
import { GroupPersonField } from "@/components/group-person-field";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import type { PersonInput } from "@/components/use-group-create";
import { MAX_PARTICIPANTS } from "@/domain/group-input";
import { PlusIcon } from "lucide-react";
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
        <GroupOrganizerField
          name={props.organizerName}
          onChange={(value) => {
            props.setOrganizerName(value);
          }}
        />
        {props.people.map((person, index) => (
          <GroupPersonField
            key={person.id}
            person={person}
            number={index + 1}
            removable={props.people.length > 1}
            onChange={(id, value) => {
              props.changePerson(id, value);
            }}
            onRemove={(id) => {
              props.removePerson(id);
            }}
          />
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

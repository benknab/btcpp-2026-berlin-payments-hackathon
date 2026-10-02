import { EventPersonNameInput } from "@/components/event-person-name-input";
import { LabeledField } from "@/components/labeled-field";
import { FieldGroup } from "@/components/ui/field";
import type { ReactNode } from "react";

interface EventPersonFieldsProps {
  readonly id: number;
  readonly number: number;
  readonly removable: boolean;
  readonly onRemove: (id: number) => void;
}

export function EventPersonFields({ id, number, removable, onRemove }: EventPersonFieldsProps): ReactNode {
  return (
    <FieldGroup>
      <LabeledField id={`person-${id}`} label={`Person ${number}`}>
        <EventPersonNameInput id={id} number={number} removable={removable} onRemove={onRemove} />
      </LabeledField>
    </FieldGroup>
  );
}

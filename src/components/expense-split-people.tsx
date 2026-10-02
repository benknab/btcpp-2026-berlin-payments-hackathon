import { ExpenseSplitPerson } from "@/components/expense-split-person";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import type { ExpenseSplitState } from "@/components/use-expense-split";
import type { ParticipantData } from "@/db/groups";
import type { ReactNode } from "react";

export function ExpenseSplitPeople({
  split,
  participants,
  disabled,
}: {
  readonly split: ExpenseSplitState;
  readonly participants: readonly ParticipantData[];
  readonly disabled: boolean;
}): ReactNode {
  const { selected } = split.draft;
  return (
    <FieldSet disabled={disabled}>
      <FieldLegend className="sr-only">People included in the split</FieldLegend>
      <FieldGroup className="gap-0 divide-y rounded-lg border">
        <Field orientation="horizontal" className="p-4" data-disabled={disabled}>
          <Checkbox
            id="split-all"
            checked={selected.length === participants.length}
            indeterminate={selected.length > 0 && selected.length < participants.length}
            disabled={disabled}
            onCheckedChange={(checked) => {
              split.selectAll(checked);
            }}
          />
          <FieldLabel htmlFor="split-all">All</FieldLabel>
        </Field>
        {participants.map((person) => (
          <ExpenseSplitPerson key={person.id} split={split} person={person} disabled={disabled} />
        ))}
      </FieldGroup>
    </FieldSet>
  );
}

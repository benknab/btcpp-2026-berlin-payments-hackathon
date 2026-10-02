import { ExpenseCustomSplit } from "@/components/expense-custom-split";
import { ExpenseSplitChoice } from "@/components/expense-split-choice";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import type { ExpenseSplitState } from "@/components/use-expense-split";
import type { ParticipantData } from "@/db/groups";
import type { ReactNode } from "react";

export function ExpenseSplitter({
  split,
  participants,
  disabled,
  showError,
}: {
  readonly split: ExpenseSplitState;
  readonly participants: readonly ParticipantData[];
  readonly disabled: boolean;
  readonly showError: boolean;
}): ReactNode {
  return (
    <FieldSet disabled={disabled}>
      <FieldLegend>How to split?</FieldLegend>
      <FieldGroup>
        <ExpenseSplitChoice split={split} disabled={disabled} />
        {split.draft.custom && <ExpenseCustomSplit split={split} participants={participants} disabled={disabled} />}
        <Field id="split-error" data-invalid={showError && split.error !== null}>
          {showError && split.error !== null ? <FieldError>{split.error}</FieldError> : null}
          {split.error === null && (
            <FieldDescription>
              {split.config.entries.length} people · {split.config.mode === "equal" ? "Equal split" : "Custom split"}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

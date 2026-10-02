import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ExpenseSplitState } from "@/components/use-expense-split";
import type { ParticipantData } from "@/db/groups";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

export function ExpenseSplitPerson({
  split,
  person,
  disabled,
  previewOnly = false,
}: {
  readonly split: ExpenseSplitState;
  readonly person: ParticipantData;
  readonly disabled: boolean;
  readonly previewOnly?: boolean;
}): ReactNode {
  const { selected } = split.draft;
  const mode = previewOnly ? "equal" : split.draft.mode;
  const included = selected.includes(person.id);
  const share = split.preview.find((entry) => entry.participantId === person.id);
  const unit = { equal: "sats", amount: "sats", shares: "shares", percent: "%" }[mode];
  const invalid = included && mode !== "equal" && split.error !== null;
  return (
    <Field orientation="horizontal" className="flex-wrap p-4" data-disabled={disabled} data-invalid={invalid}>
      {!previewOnly && (
        <Checkbox
          id={`split-person-${person.id}`}
          checked={included}
          disabled={disabled}
          onCheckedChange={(checked) => {
            split.select(person.id, checked);
          }}
        />
      )}
      {previewOnly ? (
        <span className="min-w-0 flex-1 font-medium break-words">{person.name}</span>
      ) : (
        <FieldLabel htmlFor={`split-person-${person.id}`} className="min-w-0 flex-1 break-words">
          {person.name}
        </FieldLabel>
      )}
      {!previewOnly && mode !== "equal" && (
        <div className="flex items-center gap-2">
          <Input
            aria-label={`${person.name}: ${unit}`}
            aria-invalid={invalid}
            aria-describedby={invalid ? "split-error" : undefined}
            type="number"
            min="0"
            step={mode === "amount" ? "1" : "0.01"}
            className="w-24"
            disabled={disabled || !included}
            value={split.draft.values[person.id] ?? (mode === "shares" ? "1" : "")}
            placeholder="0"
            onChange={(event) => {
              split.changeValue(person.id, event.target.value);
            }}
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      )}
      <span className="min-w-20 text-right text-sm text-muted-foreground tabular-nums">
        {(included || previewOnly) && split.error !== null ? "—" : formatSats(share?.amountSats ?? 0)}
      </span>
    </Field>
  );
}

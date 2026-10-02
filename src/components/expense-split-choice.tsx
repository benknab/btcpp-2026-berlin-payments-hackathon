import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ExpenseSplitState } from "@/components/use-expense-split";
import type { ReactNode } from "react";

export function ExpenseSplitChoice({
  split,
  disabled,
}: {
  readonly split: ExpenseSplitState;
  readonly disabled: boolean;
}): ReactNode {
  return (
    <RadioGroup
      value={split.draft.custom ? "custom" : "everyone"}
      disabled={disabled}
      onValueChange={(value) => {
        split.customize(value === "custom");
      }}
    >
      <Field orientation="horizontal" data-disabled={disabled}>
        <RadioGroupItem id="split-everyone" value="everyone" />
        <FieldLabel htmlFor="split-everyone">Split equally between everyone</FieldLabel>
      </Field>
      <Field orientation="horizontal" data-disabled={disabled}>
        <RadioGroupItem id="split-custom" value="custom" />
        <FieldLabel htmlFor="split-custom">Split differently</FieldLabel>
      </Field>
    </RadioGroup>
  );
}

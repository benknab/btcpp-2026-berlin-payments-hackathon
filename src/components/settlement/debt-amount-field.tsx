import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { DraftDebt } from "@/lib/settlement-draft";
import type { ReactNode } from "react";

interface DebtAmountProps {
  readonly debt: DraftDebt;
  readonly pending: boolean;
  readonly invalid: boolean;
  readonly onChange: (debt: DraftDebt) => void;
}

export function DebtAmountField({ debt, pending, invalid, onChange }: DebtAmountProps): ReactNode {
  return (
    <Field data-invalid={invalid} data-disabled={pending}>
      <FieldLabel htmlFor={`${debt.id}-amount`}>Amount (sats)</FieldLabel>
      <Input
        id={`${debt.id}-amount`}
        type="number"
        inputMode="numeric"
        min={1}
        max={Number.MAX_SAFE_INTEGER}
        step={1}
        value={debt.amount}
        required
        disabled={pending}
        aria-invalid={invalid}
        onChange={(event) => {
          onChange({ ...debt, amount: event.target.value });
        }}
      />
    </Field>
  );
}

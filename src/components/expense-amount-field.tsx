import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ExpenseFormState } from "@/components/use-expense-form";
import { MAX_SATS } from "@/domain/money";
import type { ReactNode } from "react";

export function ExpenseAmountField({ form }: Readonly<{ form: ExpenseFormState }>): ReactNode {
  return (
    <Field data-disabled={form.pending}>
      <FieldLabel htmlFor="expense-amount">Amount (sats)</FieldLabel>
      <Input
        id="expense-amount"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_SATS}
        step={1}
        placeholder="12000"
        value={form.values.amount}
        required
        disabled={form.pending}
        onChange={(event) => {
          form.change("amount", event.target.value);
        }}
      />
    </Field>
  );
}

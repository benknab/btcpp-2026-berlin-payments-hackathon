import { ExpenseAmountField } from "@/components/expense-amount-field";
import { ExpensePayerField } from "@/components/expense-payer-field";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ExpenseFormState } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
import { MAX_DESCRIPTION } from "@/domain/expense-input";
import type { ReactNode } from "react";

export function ExpenseFields({
  form,
  participants,
}: {
  readonly form: ExpenseFormState;
  readonly participants: readonly ParticipantData[];
}): ReactNode {
  return (
    <FieldGroup>
      <Field data-disabled={form.pending}>
        <FieldLabel htmlFor="expense-description">Description</FieldLabel>
        <Input
          id="expense-description"
          placeholder="Dinner"
          value={form.values.description}
          required
          maxLength={MAX_DESCRIPTION}
          disabled={form.pending}
          onChange={(event) => {
            form.change("description", event.target.value);
          }}
        />
      </Field>
      <FieldGroup className="gap-5 sm:grid sm:grid-cols-2">
        <ExpenseAmountField form={form} />
        <ExpensePayerField form={form} participants={participants} />
      </FieldGroup>
      <Field data-disabled={form.pending} className="sm:max-w-[calc(50%-0.625rem)]">
        <FieldLabel htmlFor="expense-date">Date</FieldLabel>
        <Input
          id="expense-date"
          type="date"
          value={form.values.date}
          required
          disabled={form.pending}
          onChange={(event) => {
            form.change("date", event.target.value);
          }}
        />
      </Field>
    </FieldGroup>
  );
}

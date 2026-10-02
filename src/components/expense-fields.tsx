import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ExpenseFormState } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
import { MAX_DESCRIPTION } from "@/domain/expense-input";
import { MAX_SATS } from "@/domain/money";
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
        <FieldLabel htmlFor="expense-payer">Who paid?</FieldLabel>
        <NativeSelect
          id="expense-payer"
          value={form.values.payerId}
          disabled={form.pending}
          required
          className="w-full"
          onChange={(event) => {
            form.change("payerId", event.target.value);
          }}
        >
          {participants.map((person) => (
            <NativeSelectOption key={person.id} value={person.id}>
              {person.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
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
      <Field data-disabled={form.pending}>
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

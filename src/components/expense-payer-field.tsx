import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ExpenseFormState } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
import type { ReactNode } from "react";

export function ExpensePayerField({
  form,
  participants,
}: Readonly<{ form: ExpenseFormState; participants: readonly ParticipantData[] }>): ReactNode {
  return (
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
  );
}

import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { DraftUser } from "@/lib/settlement-draft";
import type { ReactNode } from "react";

interface DebtPartyProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly users: readonly DraftUser[];
  readonly pending: boolean;
  readonly invalid: boolean;
  readonly onChange: (value: string) => void;
}

export function DebtPartyField({ id, label, value, users, pending, invalid, onChange }: DebtPartyProps): ReactNode {
  return (
    <Field data-invalid={invalid} data-disabled={pending}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        disabled={pending}
        required
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <NativeSelectOption value="">Choose participant</NativeSelectOption>
        {users.map((user) => (
          <NativeSelectOption key={user.id} value={user.id}>
            {user.name || "Unnamed participant"}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

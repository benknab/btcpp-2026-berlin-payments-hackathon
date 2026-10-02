import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { DraftUser } from "@/lib/settlement-draft";
import type { ReactNode } from "react";

interface ParticipantNameProps {
  readonly user: DraftUser;
  readonly pending: boolean;
  readonly invalid: boolean;
  readonly onChange: (user: DraftUser) => void;
}

export function ParticipantNameField({ user, pending, invalid, onChange }: ParticipantNameProps): ReactNode {
  return (
    <Field data-invalid={invalid} data-disabled={pending}>
      <FieldLabel htmlFor={`${user.id}-name`}>Participant name</FieldLabel>
      <Input
        id={`${user.id}-name`}
        value={user.name}
        required
        disabled={pending}
        aria-invalid={invalid}
        onChange={(event) => {
          onChange({ ...user, name: event.target.value });
        }}
      />
    </Field>
  );
}

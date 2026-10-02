import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_PARTICIPANT_NAME } from "@/domain/group-input";
import type { ReactNode } from "react";

export function GroupOrganizerField({
  name,
  onChange,
}: Readonly<{ name: string; onChange: (value: string) => void }>): ReactNode {
  return (
    <Field>
      <FieldLabel htmlFor="organizer-name">Your name</FieldLabel>
      <Input
        id="organizer-name"
        placeholder="Alice"
        value={name}
        required
        maxLength={MAX_PARTICIPANT_NAME}
        autoComplete="given-name"
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </Field>
  );
}

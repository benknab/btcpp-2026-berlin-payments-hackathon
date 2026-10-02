import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_PARTICIPANT_NAME } from "@/domain/group-input";
import type { ReactNode } from "react";

export function OrganizerNameField(): ReactNode {
  return (
    <Field>
      <FieldLabel htmlFor="your-name">You</FieldLabel>
      <Input
        id="your-name"
        name="organizerName"
        placeholder="Your name"
        autoComplete="given-name"
        className="h-12 px-4"
        required
        maxLength={MAX_PARTICIPANT_NAME}
      />
    </Field>
  );
}

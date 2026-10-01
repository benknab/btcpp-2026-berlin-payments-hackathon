import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_NOTE_LENGTH } from "@/lib/note-input";
import type { ReactNode } from "react";

interface NoteFieldProps {
  readonly body: string;
  readonly pending: boolean;
  readonly onChange: (body: string) => void;
}

export function NoteField({ body, pending, onChange }: NoteFieldProps): ReactNode {
  return (
    <FieldGroup>
      <Field data-disabled={pending}>
        <FieldLabel htmlFor="note">Leave a note</FieldLabel>
        <Textarea
          id="note"
          name="body"
          value={body}
          onChange={(event): void => {
            onChange(event.target.value);
          }}
          maxLength={MAX_NOTE_LENGTH}
          aria-describedby="note-description"
          disabled={pending}
          required
        />
        <FieldDescription id="note-description">Up to {MAX_NOTE_LENGTH} characters.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

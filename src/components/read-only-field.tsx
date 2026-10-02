import { LabeledField } from "@/components/labeled-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";

interface ReadOnlyFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly spellCheck?: boolean;
  readonly selectOnFocus?: boolean;
}

export function ReadOnlyField({
  id,
  label,
  value,
  description,
  spellCheck,
  selectOnFocus = false,
}: ReadOnlyFieldProps): ReactNode {
  return (
    <FieldGroup>
      <LabeledField id={id} label={label} description={description}>
        <Input
          id={id}
          value={value}
          readOnly
          spellCheck={spellCheck}
          onFocus={(event) => {
            if (selectOnFocus) {
              event.currentTarget.select();
            }
          }}
        />
      </LabeledField>
    </FieldGroup>
  );
}

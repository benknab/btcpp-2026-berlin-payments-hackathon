import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { ReactNode } from "react";

interface LabeledFieldProps {
  readonly id: string;
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly children: ReactNode;
}

export function LabeledField({ id, label, description, disabled, invalid, children }: LabeledFieldProps): ReactNode {
  return (
    <Field data-disabled={disabled} data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description === undefined ? null : <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

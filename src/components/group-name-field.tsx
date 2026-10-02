import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_GROUP_NAME } from "@/domain/group-input";
import type { ReactNode } from "react";

interface GroupNameFieldProps {
  readonly name: string;
  readonly pending: boolean;
  readonly onChange: (value: string) => void;
}

export function GroupNameField({ name, pending, onChange }: GroupNameFieldProps): ReactNode {
  return <Field data-disabled={pending}>
    <FieldLabel htmlFor="group-name">What are we splitting?</FieldLabel>
    <Input id="group-name" placeholder="Berlin weekend" value={name} required maxLength={MAX_GROUP_NAME} disabled={pending} onChange={(event) => { onChange(event.target.value); }} />
    <FieldDescription>A trip, a dinner, or whatever brings you together.</FieldDescription>
  </Field>;
}

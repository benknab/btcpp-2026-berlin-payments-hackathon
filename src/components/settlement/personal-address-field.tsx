import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";

export function PersonalAddressField({
  address,
  invalid,
  disabled,
  onChange,
}: {
  readonly address: string;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}): ReactNode {
  return (
    <Field data-invalid={invalid} data-disabled={disabled}>
      <FieldLabel htmlFor="personal-ark-address">Your Bark signet address</FieldLabel>
      <Input
        id="personal-ark-address"
        value={address}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="tark1…"
        required
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid}
        disabled={disabled}
      />
      {invalid && <FieldError>Enter a Bark signet address beginning with tark1.</FieldError>}
    </Field>
  );
}

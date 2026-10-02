import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  isPayoutDestination,
  PAYOUT_DESTINATION_ERROR,
  MAX_PAYOUT_DESTINATION_LENGTH,
} from "@/domain/payout-destination";
import { useState } from "react";
import type { ReactNode } from "react";

interface ReceivingAddressFieldProps {
  readonly id: string;
  readonly name: string;
  readonly required?: boolean;
}

function validate(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  const valid = value === "" || isPayoutDestination(value);
  input.setCustomValidity(valid ? "" : PAYOUT_DESTINATION_ERROR);
  return valid;
}

export function ReceivingAddressField({ id, name, required = false }: ReceivingAddressFieldProps): ReactNode {
  const [invalid, setInvalid] = useState(false);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{required ? "Receiving address" : "Receiving address (optional)"}</FieldLabel>
      <Input
        id={id}
        name={name}
        required={required}
        placeholder="name@wallet.com, lnurl1…, ark1…, or lno1…"
        className="h-12 px-4"
        maxLength={MAX_PAYOUT_DESTINATION_LENGTH}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => {
          const valid = validate(event.currentTarget);
          if (invalid) {
            setInvalid(!valid);
          }
        }}
        onBlur={(event) => {
          setInvalid(!validate(event.currentTarget));
        }}
      />
      {invalid && <FieldError id={`${id}-error`}>{PAYOUT_DESTINATION_ERROR}</FieldError>}
    </Field>
  );
}

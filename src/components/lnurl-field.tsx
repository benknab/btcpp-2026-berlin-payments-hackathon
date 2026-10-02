import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isLnurl, LNURL_ERROR, MAX_LNURL_LENGTH } from "@/domain/lnurl";
import { useState } from "react";
import type { ReactNode } from "react";

interface LnurlFieldProps {
  readonly id: string;
  readonly name: string;
}

function validate(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  const valid = value === "" || isLnurl(value);
  input.setCustomValidity(valid ? "" : LNURL_ERROR);
  return valid;
}

export function LnurlField({ id, name }: LnurlFieldProps): ReactNode {
  const [invalid, setInvalid] = useState(false);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>LNURL (optional)</FieldLabel>
      <Input
        id={id}
        name={name}
        placeholder="name@wallet.com or lnurl1…"
        className="h-12 px-4"
        maxLength={MAX_LNURL_LENGTH}
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
      {invalid && <FieldError id={`${id}-error`}>{LNURL_ERROR}</FieldError>}
    </Field>
  );
}

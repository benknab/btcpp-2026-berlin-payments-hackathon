import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { validDraftAmount } from "@/lib/settlement-draft";
import type { DraftDebt, DraftUser } from "@/lib/settlement-draft";
import { Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

interface DebtProps {
  readonly debt: DraftDebt;
  readonly users: readonly DraftUser[];
  readonly pending: boolean;
  readonly showErrors: boolean;
  readonly onChange: (debt: DraftDebt) => void;
  readonly onRemove: () => void;
}

export function DebtInput({ debt, users, pending, showErrors, onChange, onRemove }: DebtProps): ReactNode {
  const invalidParties = showErrors && (debt.from === debt.to || debt.from === "" || debt.to === "");
  const invalidAmount = showErrors && !validDraftAmount(debt.amount);
  return (
    <FieldGroup className="rounded-lg border p-4 sm:grid sm:grid-cols-3">
      <Field data-invalid={invalidParties} data-disabled={pending}>
        <FieldLabel htmlFor={`${debt.id}-from`}>Who owes</FieldLabel>
        <NativeSelect
          id={`${debt.id}-from`}
          className="w-full"
          value={debt.from}
          disabled={pending}
          required
          aria-invalid={invalidParties}
          onChange={(event): void => {
            onChange({ ...debt, from: event.target.value });
          }}
        >
          <NativeSelectOption value="">Choose participant</NativeSelectOption>
          {users.map((user) => (
            <NativeSelectOption key={user.id} value={user.id}>
              {user.name || "Unnamed participant"}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field data-invalid={invalidParties} data-disabled={pending}>
        <FieldLabel htmlFor={`${debt.id}-to`}>Owes whom</FieldLabel>
        <NativeSelect
          id={`${debt.id}-to`}
          className="w-full"
          value={debt.to}
          disabled={pending}
          required
          aria-invalid={invalidParties}
          onChange={(event): void => {
            onChange({ ...debt, to: event.target.value });
          }}
        >
          <NativeSelectOption value="">Choose participant</NativeSelectOption>
          {users.map((user) => (
            <NativeSelectOption key={user.id} value={user.id}>
              {user.name || "Unnamed participant"}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field data-invalid={invalidAmount} data-disabled={pending}>
        <FieldLabel htmlFor={`${debt.id}-amount`}>Amount (sats)</FieldLabel>
        <Input
          id={`${debt.id}-amount`}
          type="number"
          inputMode="numeric"
          min={1}
          max={Number.MAX_SAFE_INTEGER}
          step={1}
          value={debt.amount}
          required
          disabled={pending}
          aria-invalid={invalidAmount}
          onChange={(event): void => {
            onChange({ ...debt, amount: event.target.value });
          }}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={pending}
        onClick={onRemove}
        aria-label="Remove debt"
      >
        <Trash2Icon data-icon="inline-start" /> Remove debt
      </Button>
    </FieldGroup>
  );
}

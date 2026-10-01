import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SignetAddress } from "@/lib/pot";
import type { DraftUser } from "@/lib/settlement-draft";
import { Schema } from "effect";
import { Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

interface ParticipantProps {
  readonly user: DraftUser;
  readonly pending: boolean;
  readonly showErrors: boolean;
  readonly canRemove: boolean;
  readonly onChange: (user: DraftUser) => void;
  readonly onRemove: () => void;
}

export function ParticipantInput({
  user,
  pending,
  showErrors,
  canRemove,
  onChange,
  onRemove,
}: ParticipantProps): ReactNode {
  const invalidName = showErrors && user.name.trim().length === 0;
  const invalidAddress = showErrors && !Schema.is(SignetAddress)(user.arkAddress.trim());
  return (
    <FieldGroup className="rounded-lg border p-4">
      <Field data-invalid={invalidName} data-disabled={pending}>
        <FieldLabel htmlFor={`${user.id}-name`}>Participant name</FieldLabel>
        <Input
          id={`${user.id}-name`}
          value={user.name}
          required
          disabled={pending}
          aria-invalid={invalidName}
          onChange={(event): void => {
            onChange({ ...user, name: event.target.value });
          }}
        />
      </Field>
      <Field data-invalid={invalidAddress} data-disabled={pending}>
        <FieldLabel htmlFor={`${user.id}-address`}>Payout address for {user.name || "participant"}</FieldLabel>
        <Input
          id={`${user.id}-address`}
          placeholder="tark1…"
          value={user.arkAddress}
          required
          disabled={pending}
          aria-invalid={invalidAddress}
          autoComplete="off"
          spellCheck={false}
          onChange={(event): void => {
            onChange({ ...user, arkAddress: event.target.value });
          }}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={pending || !canRemove}
        onClick={onRemove}
        aria-label={`Remove ${user.name || "participant"}`}
      >
        <Trash2Icon data-icon="inline-start" /> Remove participant
      </Button>
    </FieldGroup>
  );
}

import type { ParticipantData } from "@/db/groups";
import { isPayoutDestination, MAX_PAYOUT_DESTINATION_LENGTH } from "@/domain/payout-destination";
import { updateReceivingAddress } from "@/server/event-settlement";
import { useState } from "react";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { LabeledField } from "./labeled-field";
import { Button } from "./ui/button";
import { FieldGroup } from "./ui/field";
import { Input } from "./ui/input";
import { useEventAction } from "./use-event-action";

export function EventReceivingAddress({
  inviteKey,
  participant,
}: {
  readonly inviteKey: string;
  readonly participant: ParticipantData;
}): ReactNode {
  const [value, setValue] = useState(participant.lnurl ?? "");
  const action = useEventAction();
  function handleSave(): void {
    action.run(async () => {
      await updateReceivingAddress({ data: { inviteKey, participantId: participant.id, lnurl: value.trim() } });
    }, "Could not save the receiving address.");
  }
  return (
    <FieldGroup className="gap-2">
      <LabeledField id={`receiving-${participant.id}`} label={participant.name}>
        <Input
          id={`receiving-${participant.id}`}
          required
          value={value}
          placeholder="name@wallet.com, lnurl1…, ark1…, or lno1…"
          maxLength={MAX_PAYOUT_DESTINATION_LENGTH}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          disabled={action.pending}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </LabeledField>
      <Button
        variant="outline"
        disabled={action.pending || !isPayoutDestination(value.trim()) || value === participant.lnurl}
        onClick={handleSave}
      >
        Save address
      </Button>
      <ActionError message={action.error} />
    </FieldGroup>
  );
}

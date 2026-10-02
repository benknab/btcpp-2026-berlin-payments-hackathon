import type { ParticipantData } from "@/db/groups";
import { isLnurl } from "@/domain/lnurl";
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
    }, "Could not save the receiving address. Use a distinct Lightning address or LNURL.");
  }
  return (
    <FieldGroup className="gap-2">
      <LabeledField id={`receiving-${participant.id}`} label={`${participant.name} · receiving address`}>
        <Input
          id={`receiving-${participant.id}`}
          value={value}
          disabled={action.pending}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </LabeledField>
      <Button
        variant="outline"
        disabled={action.pending || !isLnurl(value.trim()) || value === participant.lnurl}
        onClick={handleSave}
      >
        Save address
      </Button>
      <ActionError message={action.error} />
    </FieldGroup>
  );
}

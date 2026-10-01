import { ParticipantInput } from "@/components/settlement/participant-input";
import type { DraftController } from "@/components/settlement/use-settlement-draft";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { canAddDraftUser } from "@/lib/settlement-draft";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

const MIN_USERS = 2;

export function ParticipantsSection({
  controller,
  pending,
}: Readonly<{ controller: DraftController; pending: boolean }>): ReactNode {
  return (
    <FieldSet>
      <FieldLegend>Participants & payout addresses</FieldLegend>
      <FieldDescription>Addresses are locked when the pot is created. Never enter a recovery phrase.</FieldDescription>
      <FieldGroup>
        {controller.draft.users.map((user) => (
          <ParticipantInput
            key={user.id}
            user={user}
            pending={pending}
            showErrors={controller.showErrors}
            canRemove={controller.draft.users.length > MIN_USERS}
            onChange={controller.handleUserChange}
            onRemove={(): void => {
              controller.handleUserRemove(user.id);
            }}
          />
        ))}
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={pending || !canAddDraftUser(controller.draft)}
        onClick={controller.handleUserAdd}
      >
        <PlusIcon data-icon="inline-start" /> Add participant
      </Button>
    </FieldSet>
  );
}

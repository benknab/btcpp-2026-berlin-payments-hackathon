import { ParticipantAddressStatus } from "@/components/settlement/participant-address-status";
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
      <FieldDescription>
        Testing: fresh tark addresses are filled from the shared signet wallet. Payouts return to that wallet, not
        individual participants. Replace them with personal addresses if needed; saving locks them.
      </FieldDescription>
      <ParticipantAddressStatus controller={controller} pending={pending} />
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
        disabled={pending || controller.addressPending || !canAddDraftUser(controller.draft)}
        onClick={controller.handleUserAdd}
      >
        <PlusIcon data-icon="inline-start" /> Add participant
      </Button>
    </FieldSet>
  );
}

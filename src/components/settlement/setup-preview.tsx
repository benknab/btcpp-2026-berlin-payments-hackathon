import { MessageAlert } from "@/components/message-alert";
import type { DraftController } from "@/components/settlement/use-settlement-draft";
import type { ReactNode } from "react";

export function SetupPreview({ controller }: Readonly<{ controller: DraftController }>): ReactNode {
  if (controller.preview !== null) {
    return (
      <MessageAlert title="Net settlement preview">
        <ul>
          {controller.preview.obligations.map((obligation) => (
            <li key={obligation.userId}>
              {controller.draft.users.find((user) => user.id === obligation.userId)?.name}: pay{" "}
              {obligation.payInSat.toLocaleString()} sats · receive {obligation.receiveSat.toLocaleString()} sats
            </li>
          ))}
        </ul>
      </MessageAlert>
    );
  }
  if (!controller.showErrors) {
    return null;
  }
  return (
    <MessageAlert variant="destructive" title="Check the settlement inputs">
      Enter all names, valid mainnet payout addresses, and at least one positive whole-sat debt between different
      participants.
    </MessageAlert>
  );
}

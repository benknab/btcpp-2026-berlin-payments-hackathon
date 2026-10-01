import type { DraftController } from "@/components/settlement/use-settlement-draft";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ReactNode } from "react";

export function SetupPreview({ controller }: Readonly<{ controller: DraftController }>): ReactNode {
  if (controller.preview !== null) {
    return (
      <Alert>
        <AlertTitle>Net settlement preview</AlertTitle>
        <AlertDescription>
          <ul>
            {controller.preview.obligations.map((obligation) => (
              <li key={obligation.userId}>
                {controller.draft.users.find((user) => user.id === obligation.userId)?.name}: pay{" "}
                {obligation.payInSat.toLocaleString()} sats · receive {obligation.receiveSat.toLocaleString()} sats
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }
  if (!controller.showErrors) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Check the settlement inputs</AlertTitle>
      <AlertDescription>
        Enter all names, distinct signet payout addresses, and at least one positive whole-sat debt between different
        participants.
      </AlertDescription>
    </Alert>
  );
}

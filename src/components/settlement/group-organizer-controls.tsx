import { Button } from "@/components/ui/button";
import type { GroupSettlementPage } from "@/db/group-settlements";
import { potFullyFunded } from "@/lib/settlement";
import type { ReactNode } from "react";

import { ConfirmGroupAction } from "./confirm-group-action";
import type { useGroupPayment } from "./use-group-payment";

export function GroupOrganizerControls({
  page,
  action,
}: {
  readonly page: GroupSettlementPage;
  readonly action: ReturnType<typeof useGroupPayment>;
}): ReactNode {
  const initializing = page.status === "settling" && page.pot === null;
  if (page.status === "open" || initializing) {
    return (
      <ConfirmGroupAction
        label={initializing ? "Resume pot setup" : "Lock settlement"}
        pending={action.pending}
        disabled={page.preview.missingNames.length > 0}
        description={`Lock expenses and payout addresses. Debtors will pay ${page.preview.totalSat.toLocaleString()} sats. This cannot be undone.`}
        onConfirm={() => {
          action.run("close");
        }}
      />
    );
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          action.run("refresh");
        }}
        disabled={action.pending}
      >
        Check deposits
      </Button>
      <ConfirmGroupAction
        label={page.pot?.status === "paying" ? "Reconcile and finish payouts" : "Pay creditors"}
        pending={action.pending}
        disabled={page.pot === null || !potFullyFunded(page.pot)}
        description="Send locked signet payouts to participants’ personal addresses. Pending attempts will be reconciled."
        onConfirm={() => {
          action.run("pay");
        }}
      />
    </>
  );
}

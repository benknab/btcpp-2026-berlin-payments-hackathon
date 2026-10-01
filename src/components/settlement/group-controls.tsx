import { ActionError } from "@/components/action-error";
import { ConfirmGroupAction } from "@/components/settlement/confirm-group-action";
import { useGroupPayment } from "@/components/settlement/use-group-payment";
import { Button } from "@/components/ui/button";
import type { GroupSettlementPage } from "@/db/group-settlements";
import { potFullyFunded } from "@/lib/settlement";
import type { ReactNode } from "react";

export function GroupSettlementControls({
  inviteKey,
  page,
  isOrganizer,
}: Readonly<{
  inviteKey: string;
  page: GroupSettlementPage;
  isOrganizer: boolean;
}>): ReactNode {
  const action = useGroupPayment(inviteKey, page.preview.fingerprint);
  const initializing = page.status === "settling" && page.pot === null;
  const controls =
    page.status === "open" || initializing ? (
      <ConfirmGroupAction
        label={initializing ? "Resume pot setup" : "Close group"}
        pending={action.pending}
        disabled={page.preview.missingNames.length > 0}
        description={`Lock all expenses and payout addresses. Net debtors will pay ${page.preview.totalSat.toLocaleString()} sats into the signet pot. This cannot be undone; no payouts are sent by this step.`}
        onConfirm={() => {
          action.run("close");
        }}
      />
    ) : (
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
          description="Send the locked signet payouts to participants’ personal addresses. The server rechecks every deposit and spendable funds. Existing uncertain attempts are reconciled, never blindly resent."
          onConfirm={() => {
            action.run("pay");
          }}
        />
      </>
    );
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => {
            action.refreshView();
          }}
          disabled={action.pending}
        >
          Refresh status
        </Button>
        {isOrganizer && page.status !== "settled" ? controls : null}
      </div>
      {!isOrganizer && page.status !== "settled" ? (
        <p className="text-sm text-muted-foreground">
          The organizer closes the group, checks wallet deposits, and authorizes payouts. Refresh status reads saved
          progress.
        </p>
      ) : null}
      <ActionError message={action.error} />
    </section>
  );
}

import type { EventInvoice } from "@/db/event-payment-schema";
import { deliveredFor } from "@/domain/event-funding";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { formatSats } from "@/domain/money";
import { createContributionInvoice } from "@/server/event-funding";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { ContributionQr } from "./contribution-qr";
import { Button } from "./ui/button";
import { useEventAction } from "./use-event-action";

export function EventContribution({
  inviteKey,
  member,
  invoices,
}: {
  readonly inviteKey: string;
  readonly member: EventSettlementMember;
  readonly invoices: readonly EventInvoice[];
}): ReactNode {
  const action = useEventAction();
  const delivered = deliveredFor(member.participantId, invoices);
  const active = invoices.find(
    (invoice) =>
      invoice.purpose === "contribution" &&
      invoice.participantId === member.participantId &&
      (invoice.status === "pending" || invoice.status === "paid"),
  );
  function handleInvoice(): void {
    action.run(async () => {
      await createContributionInvoice({ data: { inviteKey, participantId: member.participantId } });
    }, "Could not create the invoice. Check that the mainnet receiving daemon is configured and running.");
  }
  return (
    <div className="flex flex-col gap-3">
      <p>
        {member.name}: {formatSats(delivered)} / {formatSats(member.payInSats)} delivered
      </p>
      {delivered < member.payInSats && (
        <Button variant="outline" onClick={handleInvoice} disabled={action.pending}>
          Pay {member.name}&apos;s share
        </Button>
      )}
      {active !== undefined && (
        <p className="text-sm text-muted-foreground">
          {active.status === "paid" ? "Paid · delivering to event wallet" : "Awaiting payment"}
        </p>
      )}
      {active?.status === "pending" && <ContributionQr invoice={active} />}
      <ActionError message={action.error} />
    </div>
  );
}

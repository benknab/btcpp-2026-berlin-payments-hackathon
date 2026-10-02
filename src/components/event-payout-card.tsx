import type { EventInvoice, EventPayout } from "@/db/event-payment-schema";
import { isEventFunded } from "@/domain/event-funding";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { SectionCard } from "./section-card";
import { Button } from "./ui/button";
import { useEventPayouts } from "./use-event-payouts";

export function EventPayoutCard({
  inviteKey,
  arkAddress,
  members,
  invoices,
  payouts,
  settled,
}: {
  readonly inviteKey: string;
  readonly arkAddress: string;
  readonly members: readonly EventSettlementMember[];
  readonly invoices: readonly EventInvoice[];
  readonly payouts: readonly EventPayout[];
  readonly settled: boolean;
}): ReactNode {
  const action = useEventPayouts(inviteKey, arkAddress);
  return (
    <SectionCard title={settled ? "Settled" : "Payouts"} contentClassName="flex flex-col gap-4">
      {members
        .filter((member) => member.receiveSats > 0)
        .map((member) => (
          <p key={member.participantId} className="break-all">
            {member.name} · {formatSats(member.receiveSats)} · {member.lnurl} ·{" "}
            {payouts.find((payout) => payout.participantId === member.participantId && payout.status !== "expired")
              ?.status ?? "unpaid"}
          </p>
        ))}
      {!settled && (
        <Button disabled={action.pending || !isEventFunded(members, invoices)} onClick={action.handlePay}>
          {action.pending ? "Processing…" : "Pay creditors / reconcile"}
        </Button>
      )}
      <ActionError message={action.error} />
    </SectionCard>
  );
}

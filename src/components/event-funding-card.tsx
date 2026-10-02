import type { EventInvoice } from "@/db/event-payment-schema";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { refreshContributions } from "@/server/event-funding";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { EventContribution } from "./event-contribution";
import { SectionCard } from "./section-card";
import { Button } from "./ui/button";
import { useEventAction } from "./use-event-action";

export function EventFundingCard({
  inviteKey,
  members,
  invoices,
}: {
  readonly inviteKey: string;
  readonly members: readonly EventSettlementMember[];
  readonly invoices: readonly EventInvoice[];
}): ReactNode {
  const action = useEventAction();
  function handleRefresh(): void {
    action.run(async () => {
      await refreshContributions({ data: { inviteKey } });
    }, "Could not refresh contributions. Check the receiving daemon and try again.");
  }
  return (
    <SectionCard title="Contributions" contentClassName="flex flex-col gap-6">
      {members
        .filter((member) => member.payInSats > 0)
        .map((member) => (
          <EventContribution key={member.participantId} inviteKey={inviteKey} member={member} invoices={invoices} />
        ))}
      <Button variant="outline" onClick={handleRefresh} disabled={action.pending}>
        Refresh contributions
      </Button>
      <ActionError message={action.error} />
    </SectionCard>
  );
}

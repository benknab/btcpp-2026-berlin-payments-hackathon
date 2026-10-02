import type { GroupView } from "@/db/groups";
import type { EventPageData } from "@/server/event-page";
import type { ReactNode } from "react";

import { EventFundingCard } from "./event-funding-card";
import { EventPayoutCard } from "./event-payout-card";
import { EventSettlementCard } from "./event-settlement-card";
import { EventWalletCard } from "./event-wallet-card";

export function EventPayments({
  inviteKey,
  view,
  page,
}: {
  readonly inviteKey: string;
  readonly view: GroupView;
  readonly page: EventPageData;
}): ReactNode {
  if (page.settlement === null && view.group.status !== "open") {
    return null;
  }
  return (
    <>
      <EventSettlementCard inviteKey={inviteKey} view={view} members={page.settlement} payouts={page.payouts} />
      {page.settlement !== null && (
        <EventFundingCard inviteKey={inviteKey} members={page.settlement} invoices={page.invoices} />
      )}
      {page.settlement !== null && view.isOrganizer && view.group.arkAddress !== null && (
        <EventPayoutCard
          inviteKey={inviteKey}
          arkAddress={view.group.arkAddress}
          members={page.settlement}
          invoices={page.invoices}
          payouts={page.payouts}
          settled={view.group.status === "settled"}
        />
      )}
      {view.group.arkAddress !== null && (
        <EventWalletCard
          inviteKey={inviteKey}
          arkAddress={view.group.arkAddress}
          isOrganizer={view.isOrganizer}
          ownerAddress={view.participants.find((member) => member.position === 0)?.lnurl ?? ""}
          settled={view.group.status === "settled"}
        />
      )}
    </>
  );
}

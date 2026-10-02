import { deliveredFeeReserve } from "@/domain/event-funding";
import { formatSats } from "@/domain/money";
import type { EventPageData } from "@/server/event-page";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { ContributionQr } from "./contribution-qr";
import { SectionCard } from "./section-card";
import { Button } from "./ui/button";
import { useEventFeeReserve } from "./use-event-fee-reserve";

export function EventFeeReserve({
  inviteKey,
  arkAddress,
  page,
}: {
  readonly inviteKey: string;
  readonly arkAddress: string;
  readonly page: EventPageData;
}): ReactNode {
  const { requiredSats, prepare, ...action } = useEventFeeReserve(inviteKey, arkAddress);
  const active = page.invoices.find(
    (entry) => entry.purpose === "fee-reserve" && (entry.status === "pending" || entry.status === "paid"),
  );
  return (
    <SectionCard title="Owner fee reserve" contentClassName="flex flex-col gap-3">
      <p>Deposited: {formatSats(deliveredFeeReserve(page.invoices))}</p>
      {requiredSats !== null && <p>Estimated fees: {formatSats(requiredSats)}</p>}
      {active !== undefined && <p>Deposit: {formatSats(active.amountSats)}</p>}
      <Button variant="outline" disabled={action.pending} onClick={prepare}>
        {action.pending ? "Checking…" : "Estimate fees / deposit"}
      </Button>
      {active?.status === "pending" && <ContributionQr invoice={active} title="Owner fee reserve invoice" />}
      {active?.status === "paid" && <p className="text-sm text-muted-foreground">Paid · delivering to event wallet</p>}
      <ActionError message={action.error} />
    </SectionCard>
  );
}

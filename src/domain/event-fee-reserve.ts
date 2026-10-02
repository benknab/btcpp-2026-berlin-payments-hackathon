import type { EventInvoice, EventPayout } from "@/db/event-payment-schema";

import { deliveredFeeReserve } from "./event-funding";
import type { EventSettlementMember } from "./event-settlement";

export function unsentCreditors(
  members: readonly EventSettlementMember[],
  payouts: readonly EventPayout[],
): readonly EventSettlementMember[] {
  return members.filter(
    (member) =>
      member.receiveSats > 0 &&
      !payouts.some(
        (payout) =>
          payout.participantId === member.participantId && (payout.status === "paid" || payout.status === "sending"),
      ),
  );
}

export function payoutFundingError(input: {
  readonly feeSats: number;
  readonly payoutSats: number;
  readonly spendableSats: number;
  readonly invoices: readonly EventInvoice[];
}): "ownerReserveRequired" | "payoutBalanceLow" | null {
  if (deliveredFeeReserve(input.invoices) < input.feeSats) {
    return "ownerReserveRequired";
  }
  return input.spendableSats < input.payoutSats + input.feeSats ? "payoutBalanceLow" : null;
}

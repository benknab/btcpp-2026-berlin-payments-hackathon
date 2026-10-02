import type { EventPayout } from "@/db/event-payment-schema";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { payoutDestination } from "@/domain/payout-destination";
import { preparePayout } from "@/server/event-payouts";

import { resolvePayoutInvoice } from "./lnurl-invoice";
import type { BrowserTrace } from "./with-event-wallet";

export async function prepareMember(
  inviteKey: string,
  member: EventSettlementMember,
  payouts: readonly EventPayout[],
  trace: BrowserTrace,
): Promise<EventPayout> {
  const existing = payouts.find(
    (payout) => payout.participantId === member.participantId && payout.status !== "expired",
  );
  if (existing !== undefined && (existing.status !== "prepared" || existing.expiresAt > Date.now())) {
    await trace.log("payout.reusing", { paymentHash: existing.paymentHash, status: existing.status });
    return existing;
  }
  const destination = payoutDestination(member.lnurl ?? "");
  if (member.lnurl === null || destination === null) {
    throw new Error("A creditor is missing a valid receiving address.");
  }
  const data = { inviteKey, participantId: member.participantId, destination: member.lnurl };
  return destination.kind === "lnurl"
    ? preparePayout({
        data: { ...data, invoice: await resolvePayoutInvoice(destination.value, member.receiveSats, trace) },
        headers: trace.headers,
      })
    : preparePayout({ data, headers: trace.headers });
}

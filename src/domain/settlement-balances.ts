import type { EventInvoice, EventPayout } from "@/db/event-payment-schema";
import type { Pot } from "@/lib/pot";

import type { ParticipantBalance } from "./accounting";
import { deliveredFor } from "./event-funding";

export function applyManagedPayments(balances: readonly ParticipantBalance[], pot: Pot): readonly ParticipantBalance[] {
  return balances.map((balance) => {
    const participant = pot.participants.find((person) => person.userId === balance.participantId);
    const contributedSats = participant?.receivedSat ?? 0;
    const paidSats = participant?.payoutStatus === "paid" ? participant.receiveSat : 0;
    return { ...balance, contributedSats, settlementSats: balance.expenseBalanceSats + contributedSats - paidSats };
  });
}

export function applySettlementPayments(
  balances: readonly ParticipantBalance[],
  invoices: readonly EventInvoice[],
  payouts: readonly EventPayout[],
): readonly ParticipantBalance[] {
  return balances.map((balance) => {
    const contributedSats = deliveredFor(balance.participantId, invoices);
    const receivedSats = payouts
      .filter((payout) => payout.participantId === balance.participantId && payout.status === "paid")
      .reduce((total, payout) => total + payout.amountSats, 0);
    return { ...balance, contributedSats, settlementSats: balance.expenseBalanceSats + contributedSats - receivedSats };
  });
}

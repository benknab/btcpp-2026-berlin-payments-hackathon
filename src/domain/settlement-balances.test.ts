import type { EventInvoice, EventPayout } from "@/db/event-payment-schema";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { calculateBalances } from "./accounting";
import { applySettlementPayments } from "./settlement-balances";

const invoice: EventInvoice = {
  groupId: "event",
  participantId: "bob",
  paymentHash: "contribution",
  invoice: "invoice",
  amountSats: 5000,
  deliveredSats: 5000,
  expiresAt: 0,
  status: "delivered",
  purpose: "contribution",
};
const payout: EventPayout = {
  method: "bolt11",
  historyStartId: null,
  movementId: null,
  proofPaymentHash: null,
  groupId: "event",
  participantId: "alice",
  paymentHash: "payout",
  invoice: "invoice",
  amountSats: 5000,
  expiresAt: 0,
  status: "paid",
};

describe("remaining settlement balances", () => {
  it.effect("does not credit owner fee reserves against expense debt", () =>
    Effect.gen(function* verifyReserveSeparation() {
      const balances = yield* calculateBalances({
        participantIds: ["alice", "bob"],
        contributions: [],
        expenses: [
          {
            payerId: "alice",
            amountSats: 10_000,
            shares: [
              { participantId: "alice", amountSats: 5000 },
              { participantId: "bob", amountSats: 5000 },
            ],
          },
        ],
      });
      const remaining = applySettlementPayments(balances, [{ ...invoice, purpose: "fee-reserve" }], []);
      expect(remaining.find((member) => member.participantId === "bob")).toMatchObject({
        contributedSats: 0,
        settlementSats: -5000,
      });
    }),
  );
  it.effect("counts delivered contributions and proven payouts while retaining expense history and excess", () =>
    Effect.gen(function* verifyRemaining() {
      expect.hasAssertions();
      const balances = yield* calculateBalances({
        participantIds: ["alice", "bob"],
        contributions: [],
        expenses: [
          {
            payerId: "alice",
            amountSats: 10_000,
            shares: [
              { participantId: "alice", amountSats: 5000 },
              { participantId: "bob", amountSats: 5000 },
            ],
          },
        ],
      });
      const pending = applySettlementPayments(
        balances,
        [{ ...invoice, status: "paid" }],
        [{ ...payout, status: "sending" }],
      );
      expect(pending.map((balance) => balance.settlementSats)).toStrictEqual([5000, -5000]);
      const complete = applySettlementPayments(balances, [invoice], [payout]);
      expect(complete.map((balance) => balance.settlementSats)).toStrictEqual([0, 0]);
      expect(complete.map((balance) => balance.expenseBalanceSats)).toStrictEqual([5000, -5000]);
      const excess = applySettlementPayments(balances, [{ ...invoice, deliveredSats: 6000 }], [payout]);
      expect(excess.map((balance) => balance.settlementSats)).toStrictEqual([0, 1000]);
    }),
  );
});

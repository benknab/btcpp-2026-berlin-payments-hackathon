import type { EventInvoice, EventPayout } from "@/db/event-payment-schema";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { payoutFundingError, unsentCreditors } from "./event-fee-reserve";
import { deliveredFeeReserve, deliveredFor, isEventFunded } from "./event-funding";
import type { EventSettlementMember } from "./event-settlement";

const reserve: EventInvoice = {
  groupId: "event",
  participantId: "owner",
  paymentHash: "reserve",
  invoice: "invoice",
  purpose: "fee-reserve",
  amountSats: 20,
  deliveredSats: 20,
  expiresAt: 0,
  status: "delivered",
};
const creditor: EventSettlementMember = {
  participantId: "owner",
  name: "Alice",
  payInSats: 0,
  receiveSats: 333,
  lnurl: "alice@wallet.com",
};
const payout: EventPayout = {
  groupId: "event",
  participantId: "owner",
  paymentHash: "payment",
  invoice: "invoice",
  method: "bolt11",
  amountSats: 333,
  expiresAt: 0,
  status: "prepared",
  historyStartId: null,
  movementId: null,
  proofPaymentHash: null,
};

describe("owner fee reserve", () => {
  it.effect.each([
    { invoices: [], spendableSats: 353, expected: "ownerReserveRequired" },
    { invoices: [{ ...reserve, status: "pending" }], spendableSats: 353, expected: "ownerReserveRequired" },
    { invoices: [{ ...reserve, status: "paid" }], spendableSats: 353, expected: "ownerReserveRequired" },
    { invoices: [{ ...reserve, purpose: "contribution" }], spendableSats: 353, expected: "ownerReserveRequired" },
    { invoices: [{ ...reserve, deliveredSats: 19 }], spendableSats: 353, expected: "ownerReserveRequired" },
    { invoices: [reserve], spendableSats: 352, expected: "payoutBalanceLow" },
    { invoices: [reserve], spendableSats: 353, expected: null },
  ] as const)("requires confirmed reserves and current spendable funds %#", ({ invoices, spendableSats, expected }) =>
    Effect.sync(() => {
      expect(payoutFundingError({ feeSats: 20, payoutSats: 333, spendableSats, invoices })).toBe(expected);
    }),
  );

  it.effect("keeps the owner's reserve separate from their own net debt", () =>
    Effect.sync(() => {
      expect(deliveredFeeReserve([reserve])).toBe(20);
      expect(deliveredFor("owner", [reserve])).toBe(0);
      expect(isEventFunded([{ ...creditor, payInSats: 20, receiveSats: 0 }], [reserve])).toBe(false);
      expect(payoutFundingError({ feeSats: 0, payoutSats: 333, spendableSats: 333, invoices: [] })).toBeNull();
    }),
  );

  it.effect.each(["prepared", "expired", "sending", "paid"] as const)(
    "estimates only unstarted payouts: %s",
    (status) =>
      Effect.sync(() => {
        expect(
          unsentCreditors(
            [creditor, { ...creditor, participantId: "debtor", receiveSats: 0 }],
            [{ ...payout, status }],
          ),
        ).toStrictEqual(status === "prepared" || status === "expired" ? [creditor] : []);
      }),
  );
});

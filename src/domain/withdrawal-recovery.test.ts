import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { BOLT12_OFFER, INVOICE, MAINNET_ARK_ADDRESS, PAYMENT_HASH } from "./payout-fixture";
import type { WalletWithdrawal } from "./withdrawal";
import { withdrawalRelease } from "./withdrawal-recovery";

const withdrawal: WalletWithdrawal = {
  id: "withdrawal-1",
  method: "bolt11",
  destination: "owner@example.com",
  invoice: INVOICE,
  paymentHash: PAYMENT_HASH,
  amountSats: 440,
  feeSats: 20,
  historyStartId: 4,
  status: "sending",
};
const failed = {
  id: 5,
  status: "failed",
  intendedBalanceSats: -440,
  sentToAddresses: [],
  paymentHash: PAYMENT_HASH,
};

describe("withdrawal recovery", () => {
  it.effect("releases a definitively failed BOLT11 withdrawal only after pending checkpoints clear", () =>
    Effect.sync(() => {
      expect(withdrawalRelease(withdrawal, [failed], 0)).toBe("failed");
      expect(withdrawalRelease(withdrawal, [failed], 1)).toBeNull();
      expect(withdrawalRelease(withdrawal, [], 0)).toBeNull();
      expect(withdrawalRelease(withdrawal, [{ ...failed, status: "successful" }], 0)).toBeNull();
      expect(withdrawalRelease(withdrawal, [{ ...failed, status: "pending" }], 0)).toBeNull();
      expect(withdrawalRelease(withdrawal, [failed, { ...failed, id: 6, status: "successful" }], 0)).toBeNull();
    }),
  );

  it.effect("rejects unrelated movements and terminal withdrawal records", () =>
    Effect.sync(() => {
      expect(withdrawalRelease(withdrawal, [{ ...failed, paymentHash: "1".repeat(64) }], 0)).toBeNull();
      expect(withdrawalRelease(withdrawal, [{ ...failed, intendedBalanceSats: -500 }], 0)).toBeNull();
      expect(withdrawalRelease(withdrawal, [{ ...failed, id: 4 }], 0)).toBeNull();
      expect(withdrawalRelease({ ...withdrawal, paymentHash: null }, [failed], 0)).toBeNull();
      expect(withdrawalRelease({ ...withdrawal, status: "paid" }, [failed], 0)).toBeNull();
      expect(withdrawalRelease({ ...withdrawal, status: "failed" }, [failed], 0)).toBeNull();
    }),
  );

  it.effect("handles native failed movements and preserves BOLT12 pre-send recovery", () =>
    Effect.sync(() => {
      const bolt12 = { ...withdrawal, method: "bolt12", invoice: BOLT12_OFFER, paymentHash: null } as const;
      expect(withdrawalRelease(bolt12, [{ ...failed, lightningOffer: BOLT12_OFFER }], 0)).toBe("failed");
      expect(withdrawalRelease(bolt12, [{ ...failed, lightningOffer: BOLT12_OFFER }], 1)).toBeNull();
      expect(withdrawalRelease(bolt12, [{ ...failed, id: 4, status: "successful" }], 0)).toBe("unstarted");
      const ark = { ...withdrawal, method: "ark", invoice: MAINNET_ARK_ADDRESS, paymentHash: null } as const;
      expect(
        withdrawalRelease(
          ark,
          [{ ...failed, sentToAddresses: [JSON.stringify({ type: "ark", value: MAINNET_ARK_ADDRESS })] }],
          0,
        ),
      ).toBe("failed");
      expect(withdrawalRelease(ark, [], 0)).toBeNull();
    }),
  );
});

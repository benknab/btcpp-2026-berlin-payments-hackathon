import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { calculateBalances, splitEqually } from "./accounting";
import { MAX_SATS } from "./money";

describe("expense accounting", () => {
  it.effect("splits every sat deterministically, independent of participant order", () =>
    Effect.gen(function* verifyRounding() {
      expect.hasAssertions();
      const first = yield* splitEqually(10, ["carol", "alice", "bob"]);
      const second = yield* splitEqually(10, ["bob", "carol", "alice"]);
      expect(first).toStrictEqual(second);
      expect(first).toStrictEqual([
        { participantId: "alice", amountSats: 4 },
        { participantId: "bob", amountSats: 3 },
        { participantId: "carol", amountSats: 3 },
      ]);
      expect(yield* splitEqually(1, ["alice", "bob", "carol"])).toStrictEqual([
        { participantId: "alice", amountSats: 1 },
        { participantId: "bob", amountSats: 0 },
        { participantId: "carol", amountSats: 0 },
      ]);
    }),
  );

  it.effect("reimburses the payer and conserves the funded pot", () =>
    Effect.gen(function* verifyPot() {
      expect.hasAssertions();
      const participantIds = ["alice", "bob", "carol"];
      const shares = yield* splitEqually(12_000, participantIds);
      const balances = yield* calculateBalances({
        participantIds,
        expenses: [{ payerId: "alice", amountSats: 12_000, shares }],
        contributions: participantIds.map((participantId) => ({ participantId, amountSats: 10_000 })),
      });
      expect(balances.map((balance) => balance.settlementSats)).toStrictEqual([18_000, 6000, 6000]);
      expect(balances.reduce((total, balance) => total + balance.settlementSats, 0)).toBe(30_000);
    }),
  );

  it.effect("supports multiple payers, unequal contributions, and required top-ups", () =>
    Effect.gen(function* verifyTopUps() {
      expect.hasAssertions();
      const participantIds = ["alice", "bob", "carol"];
      const balances = yield* calculateBalances({
        participantIds,
        expenses: [
          { payerId: "alice", amountSats: 90, shares: yield* splitEqually(90, participantIds) },
          { payerId: "bob", amountSats: 60, shares: yield* splitEqually(60, participantIds) },
        ],
        contributions: [{ participantId: "carol", amountSats: 20 }],
      });
      expect(balances.map((balance) => balance.expenseBalanceSats)).toStrictEqual([40, 10, -50]);
      expect(balances.map((balance) => balance.settlementSats)).toStrictEqual([40, 10, -30]);
    }),
  );

  it.effect("keeps historical shares unchanged when a new participant joins", () =>
    Effect.gen(function* verifyHistoricalShares() {
      expect.hasAssertions();
      const balances = yield* calculateBalances({
        participantIds: ["alice", "bob", "carol"],
        expenses: [{ payerId: "alice", amountSats: 100, shares: yield* splitEqually(100, ["alice", "bob"]) }],
        contributions: [],
      });
      expect(balances.map((balance) => balance.shareSats)).toStrictEqual([50, 50, 0]);
    }),
  );

  it.effect.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_SATS + 1])(
    "rejects invalid expense amount %j",
    (amount) =>
      Effect.gen(function* verifyInvalidAmount() {
        expect.hasAssertions();
        expect((yield* Effect.flip(splitEqually(amount, ["alice"])))._tag).toBe("AccountingError");
      }),
  );

  it.effect.each([[], ["alice", "alice"], [""]])("rejects invalid participants %j", (ids: readonly string[]) =>
    Effect.gen(function* verifyInvalidParticipants() {
      expect.hasAssertions();
      expect((yield* Effect.flip(splitEqually(10, ids)))._tag).toBe("AccountingError");
    }),
  );

  it.effect("rejects unknown payers, mismatched shares, and overflowing group totals", () =>
    Effect.gen(function* verifyInvalidAccounting() {
      expect.hasAssertions();
      for (const expense of [
        { payerId: "outsider", amountSats: 10, shares: [{ participantId: "alice", amountSats: 10 }] },
        { payerId: "alice", amountSats: 10, shares: [{ participantId: "alice", amountSats: 9 }] },
        { payerId: "alice", amountSats: 10, shares: [{ participantId: "outsider", amountSats: 10 }] },
      ]) {
        expect(
          (yield* Effect.flip(calculateBalances({ participantIds: ["alice"], expenses: [expense], contributions: [] })))
            ._tag,
        ).toBe("AccountingError");
      }
      expect(
        (yield* Effect.flip(
          calculateBalances({
            participantIds: ["alice"],
            expenses: [],
            contributions: [
              { participantId: "alice", amountSats: MAX_SATS },
              { participantId: "alice", amountSats: 1 },
            ],
          }),
        ))._tag,
      ).toBe("AccountingError");
    }),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { maximumWithdrawal } from "./withdrawal";

const tieredFee = (amount: number): number => (amount >= 490 ? 30 : 20);

describe("maximum wallet withdrawal", () => {
  it.effect.each([
    { balance: 480, fee: 20, amount: 460 },
    { balance: 480, fee: 0, amount: 480 },
    { balance: 20, fee: 20, amount: 0 },
    { balance: 0, fee: 0, amount: 0 },
    { balance: 21, fee: 20, amount: 1 },
  ])("reserves $fee sats from $balance sats", ({ balance, fee, amount }) =>
    Effect.gen(function* test() {
      const result = yield* maximumWithdrawal(balance, () => Effect.succeed(fee));
      expect(result.amountSats).toBe(amount);
      expect(result.amountSats + result.feeSats).toBeLessThanOrEqual(balance);
    }),
  );

  it.effect("finds the highest affordable amount when fees change at an input boundary", () =>
    Effect.gen(function* test() {
      const result = yield* maximumWithdrawal(510, (amount) => Effect.succeed(tieredFee(amount)));
      expect(result).toStrictEqual({ amountSats: 489, feeSats: 20 });
      expect(result.amountSats + 1 + tieredFee(result.amountSats + 1)).toBeGreaterThan(510);
    }),
  );

  it.effect("propagates estimate failures and rejects invalid fee amounts", () =>
    Effect.gen(function* test() {
      expect(yield* Effect.flip(maximumWithdrawal(500, () => Effect.fail("offline")))).toBe("offline");
      expect(yield* maximumWithdrawal(500, () => Effect.succeed(-1)).pipe(Effect.result)).toMatchObject({
        _tag: "Failure",
      });
      expect(yield* maximumWithdrawal(0.5, () => Effect.succeed(0)).pipe(Effect.result)).toMatchObject({
        _tag: "Failure",
      });
    }),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { calculateExpenseSplit } from "./expense-split";
import type { ExpenseSplit } from "./expense-split";
import { MAX_SATS } from "./money";

const ids = ["a", "b", "c"];
function split(mode: ExpenseSplit["mode"], values: readonly number[]): ExpenseSplit {
  return { mode, entries: values.map((value, index) => ({ participantId: String.fromCodePoint(97 + index), value })) };
}

describe("expense splits", () => {
  it.effect("splits a selected subset equally with stable whole-sat rounding", () =>
    Effect.gen(function* verifySubset() {
      expect.hasAssertions();
      const result = yield* calculateExpenseSplit(
        101,
        {
          mode: "equal",
          entries: [
            { participantId: "c", value: 1 },
            { participantId: "a", value: 1 },
          ],
        },
        ids,
      );
      expect(result).toStrictEqual([
        { participantId: "a", amountSats: 51 },
        { participantId: "c", amountSats: 50 },
      ]);
    }),
  );
  it.effect.each([
    { config: split("amount", [0, 30, 71]), expected: [0, 30, 71] },
    { config: split("shares", [1, 2, 0]), expected: [34, 67, 0] },
    { config: split("shares", [0.5, 0.5, 1]), expected: [25, 25, 51] },
    { config: split("percent", [33.33, 33.33, 33.34]), expected: [34, 33, 34] },
    { config: split("percent", [0, 0, 100]), expected: [0, 0, 101] },
  ])(
    "allocates $config.mode precisely",
    ({ config, expected }: { readonly config: ExpenseSplit; readonly expected: readonly number[] }) =>
      Effect.gen(function* verifyAllocation() {
        expect.hasAssertions();
        const result = yield* calculateExpenseSplit(101, config, ids);
        expect(result.map((entry) => entry.amountSats)).toStrictEqual(expected);
        expect(result.reduce((total, entry) => total + entry.amountSats, 0)).toBe(101);
      }),
  );
  it.effect("conserves the maximum supported amount regardless of entry order", () =>
    Effect.gen(function* verifyLargeTotals() {
      expect.hasAssertions();
      const config = split("shares", [999_999.99, 0.01, 750_000.53]);
      const result = yield* calculateExpenseSplit(MAX_SATS, config, ids);
      expect(result.reduce((sum, entry) => sum + BigInt(entry.amountSats), 0n)).toBe(BigInt(MAX_SATS));
      expect(result.every((entry) => Number.isSafeInteger(entry.amountSats))).toBe(true);
      expect(
        yield* calculateExpenseSplit(MAX_SATS, { ...config, entries: config.entries.toReversed() }, ids),
      ).toStrictEqual(result);
    }),
  );
  it.effect.each([
    split("equal", []),
    split("amount", [20, 30, 50]),
    split("amount", [0.5, 0.5, 100]),
    split("amount", [-1, 1, 101]),
    split("amount", [Number.NaN, 0, 0]),
    split("percent", [30, 30, 30]),
    split("percent", [50, 50.001, 0]),
    split("shares", [0, 0, 0]),
    split("shares", [-1, 2, 1]),
    split("shares", [Number.POSITIVE_INFINITY, 1, 1]),
    { mode: "equal", entries: [{ participantId: "outside", value: 1 }] },
    {
      mode: "equal",
      entries: [
        { participantId: "a", value: 1 },
        { participantId: "a", value: 1 },
      ],
    },
  ] satisfies readonly ExpenseSplit[])("rejects invalid split %#", (config) =>
    Effect.gen(function* verifyInvalid() {
      expect.hasAssertions();
      expect((yield* Effect.flip(calculateExpenseSplit(101, config, ids)))._tag).toBe("AccountingError");
    }),
  );
});

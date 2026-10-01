import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { ExpenseDate, NewExpense } from "./expense-input";

describe("expense validation", () => {
  it.effect.each(["2026-02-30", "2026-13-01", "2026-00-01", "2026-1-1", "not-a-date"])(
    "rejects invalid calendar date %s",
    (date) =>
      Effect.gen(function* verifyDate() {
        expect.hasAssertions();
        expect((yield* Effect.flip(Schema.decodeUnknownEffect(ExpenseDate)(date)))._tag).toBe("SchemaError");
      }),
  );
  it.effect("accepts leap dates and validates a complete expense", () =>
    Effect.gen(function* verifyExpense() {
      expect.hasAssertions();
      expect(yield* Schema.decodeUnknownEffect(ExpenseDate)("2028-02-29")).toBe("2028-02-29");
      const input = {
        inviteKey: "a".repeat(64),
        expenseId: "00000000-0000-4000-8000-000000000001",
        payerId: "00000000-0000-4000-8000-000000000002",
        description: "Dinner",
        amountSats: 12_000,
        date: "2026-10-01",
      };
      expect(yield* Schema.decodeUnknownEffect(NewExpense)(input)).toStrictEqual(input);
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(NewExpense)({ ...input, amountSats: 1.5 })))._tag).toBe(
        "SchemaError",
      );
    }),
  );
});

import { Effect, Schema } from "effect";

import { AccountingError, splitEqually } from "./accounting";
import type { ExpenseShare } from "./accounting";
import { EntityId } from "./group-input";
import { PositiveSats, Sats } from "./money";

export const SplitModeSchema = Schema.Literals(["equal", "amount", "shares", "percent"]);
export type SplitMode = typeof SplitModeSchema.Type;
export const ExpenseSplitSchema = Schema.Struct({
  mode: SplitModeSchema,
  entries: Schema.Array(Schema.Struct({ participantId: EntityId, value: Schema.Number })),
});
export type ExpenseSplit = typeof ExpenseSplitSchema.Type;
const DECIMAL_SCALE = 100;
const MAX_WEIGHT = 1_000_000;
const DECIMAL_PLACES = 2;

function validWeight(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_WEIGHT && value === Number(value.toFixed(DECIMAL_PLACES));
}

/** Largest remainders receive leftover sats; stable participant IDs break ties. */
function weightedShares(amountSats: number, split: ExpenseSplit): readonly ExpenseShare[] {
  const weights = split.entries.map(
    (entry) => ({ ...entry, weight: BigInt(Math.round(entry.value * DECIMAL_SCALE)) }) as const,
  );
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0n);
  const allocations = weights
    .map(
      (entry) =>
        ({
          participantId: entry.participantId,
          amountSats: Number((BigInt(amountSats) * entry.weight) / total),
          remainder: (BigInt(amountSats) * entry.weight) % total,
        }) as const,
    )
    .toSorted(
      (left, right) =>
        Number(right.remainder - left.remainder) || left.participantId.localeCompare(right.participantId),
    );
  const remaining = amountSats - allocations.reduce((sum, entry) => sum + entry.amountSats, 0);
  return allocations
    .map(
      (entry, index) =>
        ({
          participantId: entry.participantId,
          amountSats: entry.amountSats + (index < remaining ? 1 : 0),
        }) as const,
    )
    .toSorted((left, right) => left.participantId.localeCompare(right.participantId));
}

const exactShares = Effect.fn("exactExpenseShares")(function* exactShares(
  amountSats: number,
  split: ExpenseSplit,
): Effect.fn.Return<readonly ExpenseShare[], AccountingError> {
  if (
    !split.entries.every((entry) => Schema.is(Sats)(entry.value)) ||
    split.entries.reduce((sum, entry) => sum + BigInt(entry.value), 0n) !== BigInt(amountSats)
  ) {
    return yield* new AccountingError({ message: "Amounts must be whole sats and add up to the expense total." });
  }
  return split.entries.map((entry) => ({ participantId: entry.participantId, amountSats: entry.value }));
});

const proportionalShares = Effect.fn("proportionalExpenseShares")(function* proportionalShares(
  amountSats: number,
  split: ExpenseSplit,
): Effect.fn.Return<readonly ExpenseShare[], AccountingError> {
  if (!split.entries.every((entry) => validWeight(entry.value))) {
    return yield* new AccountingError({
      message: "Enter nonnegative shares or percentages with at most two decimals (maximum 1,000,000).",
    });
  }
  const total = split.entries.reduce((sum, entry) => sum + BigInt(Math.round(entry.value * DECIMAL_SCALE)), 0n);
  if (total === 0n || (split.mode === "percent" && total !== 10_000n)) {
    return yield* new AccountingError({
      message: split.mode === "percent" ? "Percentages must add up to 100%." : "Enter at least one positive share.",
    });
  }
  return weightedShares(amountSats, split);
});

export const calculateExpenseSplit = Effect.fn("calculateExpenseSplit")(function* calculateExpenseSplit(
  amountSats: number,
  split: ExpenseSplit,
  participantIds: readonly string[],
): Effect.fn.Return<readonly ExpenseShare[], AccountingError> {
  if (!Schema.is(PositiveSats)(amountSats)) {
    return yield* new AccountingError({ message: "Enter a positive amount in whole sats." });
  }
  const ids = split.entries.map((entry) => entry.participantId);
  if (ids.length === 0 || new Set(ids).size !== ids.length || ids.some((id) => !participantIds.includes(id))) {
    return yield* new AccountingError({
      message: "Select at least one participant from this event, without duplicates.",
    });
  }
  if (split.mode === "equal") {
    return yield* splitEqually(amountSats, ids);
  }
  return yield* split.mode === "amount" ? exactShares(amountSats, split) : proportionalShares(amountSats, split);
});

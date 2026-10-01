import { Data, Effect, Schema } from "effect";

import { MAX_SATS, PositiveSats, Sats } from "./money";

export interface ExpenseShare {
  readonly participantId: string;
  readonly amountSats: number;
}

export interface AccountingExpense {
  readonly payerId: string;
  readonly amountSats: number;
  readonly shares: readonly ExpenseShare[];
}

export interface ParticipantBalance {
  readonly participantId: string;
  readonly contributedSats: number;
  readonly paidSats: number;
  readonly shareSats: number;
  readonly expenseBalanceSats: number;
  readonly settlementSats: number;
}

export interface AccountingInput {
  readonly participantIds: readonly string[];
  readonly expenses: readonly AccountingExpense[];
  /** Only confirmed contributions belong here. Pending deposits are not money. */
  readonly contributions: readonly ExpenseShare[];
}

export class AccountingError extends Data.TaggedError("AccountingError")<{ readonly message: string }> {}

function validParticipants(ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => id.trim().length > 0) && new Set(ids).size === ids.length;
}

/** Stable ID order decides who receives the extra sat when division has a remainder. */
export const splitEqually = Effect.fn("splitEqually")(function* splitEqually(
  amountSats: number,
  participantIds: readonly string[],
): Effect.fn.Return<readonly ExpenseShare[], AccountingError> {
  if (!Schema.is(PositiveSats)(amountSats) || !validParticipants(participantIds)) {
    return yield* new AccountingError({ message: "A split needs positive integer sats and unique participants." });
  }
  const ids = participantIds.toSorted();
  const base = Math.floor(amountSats / ids.length);
  const remainder = amountSats % ids.length;
  return ids.map((participantId, index) => ({ participantId, amountSats: base + (index < remainder ? 1 : 0) }));
});

function validExpense(expense: AccountingExpense, ids: readonly string[]): boolean {
  return (
    ids.includes(expense.payerId) &&
    Schema.is(PositiveSats)(expense.amountSats) &&
    validParticipants(expense.shares.map((share) => share.participantId)) &&
    expense.shares.every((share) => ids.includes(share.participantId) && Schema.is(Sats)(share.amountSats)) &&
    expense.shares.reduce((total, share) => total + BigInt(share.amountSats), 0n) === BigInt(expense.amountSats)
  );
}

function totalAmounts(amounts: readonly number[]): number {
  return Number(amounts.reduce((total, amount) => total + BigInt(amount), 0n));
}

function balanceFor(participantId: string, input: AccountingInput): ParticipantBalance {
  const contributedSats = totalAmounts(
    input.contributions.filter((entry) => entry.participantId === participantId).map((entry) => entry.amountSats),
  );
  const paidSats = totalAmounts(
    input.expenses.filter((entry) => entry.payerId === participantId).map((entry) => entry.amountSats),
  );
  const shareSats = totalAmounts(
    input.expenses.flatMap((expense) =>
      expense.shares.filter((share) => share.participantId === participantId).map((share) => share.amountSats),
    ),
  );
  const expenseBalanceSats = paidSats - shareSats;
  return {
    participantId,
    contributedSats,
    paidSats,
    shareSats,
    expenseBalanceSats,
    settlementSats: contributedSats + expenseBalanceSats,
  };
}

/** Negative settlement amounts require a top-up; this is not a payment authorization. */
export const calculateBalances = Effect.fn("calculateBalances")(function* calculateBalances(
  input: AccountingInput,
): Effect.fn.Return<readonly ParticipantBalance[], AccountingError> {
  const ids = input.participantIds;
  if (
    !validParticipants(input.participantIds) ||
    !input.expenses.every((expense) => validExpense(expense, ids)) ||
    !input.contributions.every((entry) => ids.includes(entry.participantId) && Schema.is(Sats)(entry.amountSats))
  ) {
    return yield* new AccountingError({ message: "Accounting contains invalid amounts, participants, or shares." });
  }
  const balances = input.participantIds.map((id) => balanceFor(id, input));
  if (
    totalAmounts(input.expenses.map((expense) => expense.amountSats)) > MAX_SATS ||
    totalAmounts(input.contributions.map((entry) => entry.amountSats)) > MAX_SATS ||
    balances.some((balance) => !Number.isSafeInteger(balance.settlementSats))
  ) {
    return yield* new AccountingError({ message: "Group totals exceed the supported sats range." });
  }
  return balances;
});

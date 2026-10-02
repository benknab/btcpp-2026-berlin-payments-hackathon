import { calculateBalances, splitEqually } from "@/domain/accounting";
import type { AccountingError, ExpenseShare } from "@/domain/accounting";
import { DeleteExpense, EditExpense, NewExpense } from "@/domain/expense-input";
import { and, desc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { Data, Effect, Schema } from "effect";

import { Database } from "./database";
import { expenses, expenseShares } from "./expense-schema";
import type { Expense } from "./expense-schema";
import { getGroup, requireParticipant } from "./groups";
import type { GroupDatabaseError, GroupError, GroupView } from "./groups";

export interface ExpenseView extends Expense {
  readonly shares: readonly ExpenseShare[];
}
export class ExpenseError extends Data.TaggedError("ExpenseError")<{ readonly message: string }> {}
export type ExpenseFailure = GroupDatabaseError | GroupError | ExpenseError | Schema.SchemaError | AccountingError;

export const listExpenses = Effect.fn("listExpenses")(function* listExpenses(
  inviteKey: string,
): Effect.fn.Return<readonly ExpenseView[], EffectDrizzleQueryError | GroupError, Database> {
  const view = yield* getGroup(inviteKey);
  const database = yield* Database;
  const entries = yield* database
    .select()
    .from(expenses)
    .where(eq(expenses.groupId, view.group.id))
    .orderBy(desc(expenses.date), desc(expenses.createdAt), desc(expenses.id));
  const shares = yield* database
    .select({
      expenseId: expenseShares.expenseId,
      participantId: expenseShares.participantId,
      amountSats: expenseShares.amountSats,
    })
    .from(expenseShares)
    .innerJoin(expenses, eq(expenseShares.expenseId, expenses.id))
    .where(eq(expenses.groupId, view.group.id));
  return entries.map((expense) => ({
    id: expense.id,
    groupId: expense.groupId,
    payerId: expense.payerId,
    description: expense.description,
    amountSats: expense.amountSats,
    date: expense.date,
    version: expense.version,
    createdAt: expense.createdAt,
    shares: shares
      .filter((share) => share.expenseId === expense.id)
      .map((share) => ({ participantId: share.participantId, amountSats: share.amountSats })),
  }));
});

export const getExpense = Effect.fn("getExpense")(function* getExpense(
  inviteKey: string,
  expenseId: string,
): Effect.fn.Return<ExpenseView, EffectDrizzleQueryError | GroupError | ExpenseError, Database> {
  const entries = yield* listExpenses(inviteKey);
  const expense = entries.find((entry) => entry.id === expenseId);
  if (expense === undefined) {
    return yield* new ExpenseError({ message: "This expense is not available in this group." });
  }
  return expense;
});

export const requireOpenGroup = Effect.fn("requireOpenGroup")(function* requireOpenGroup(
  inviteKey: string,
): Effect.fn.Return<GroupView, EffectDrizzleQueryError | GroupError | ExpenseError, Database> {
  const view = yield* getGroup(inviteKey);
  if (view.group.status !== "open") {
    return yield* new ExpenseError({ message: "Expenses are locked because settlement has started." });
  }
  return view;
});

const validateTotals = Effect.fn("validateTotals")(function* validateTotals(
  inviteKey: string,
  replacement: ExpenseView,
): Effect.fn.Return<void, EffectDrizzleQueryError | GroupError | AccountingError, Database> {
  const view = yield* getGroup(inviteKey);
  const existing = yield* listExpenses(inviteKey);
  yield* calculateBalances({
    participantIds: view.participants.map((participant) => participant.id),
    expenses: [...existing.filter((expense) => expense.id !== replacement.id), replacement],
    contributions: [],
  });
});

function matchesExpense(existing: Expense, valid: typeof NewExpense.Type, groupId: string): boolean {
  return (
    existing.groupId === groupId &&
    existing.payerId === valid.payerId &&
    existing.description === valid.description &&
    existing.amountSats === valid.amountSats &&
    existing.date === valid.date
  );
}

const insertShares = Effect.fn("insertExpenseShares")(function* insertShares(
  expenseId: string,
  shares: readonly ExpenseShare[],
) {
  const database = yield* Database;
  yield* database
    .insert(expenseShares)
    .values(shares.map((share) => ({ participantId: share.participantId, amountSats: share.amountSats, expenseId })));
});

const requireMatchingExpense = Effect.fn("requireMatchingExpense")(function* requireMatchingExpense(
  existing: Expense,
  valid: typeof NewExpense.Type,
  groupId: string,
) {
  if (!matchesExpense(existing, valid, groupId)) {
    return yield* new ExpenseError({ message: "This expense request was already used. Open a fresh expense form." });
  }
  return existing.id;
});

export const addExpense = Effect.fn("addExpense")(function* addExpense(
  input: typeof NewExpense.Type,
): Effect.fn.Return<string, ExpenseFailure, Database> {
  const valid = yield* Schema.decodeUnknownEffect(NewExpense)(input);
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* saveExpense() {
      const view = yield* requireOpenGroup(valid.inviteKey);
      yield* requireParticipant(valid.inviteKey, valid.payerId);
      const [existing] = yield* database.select().from(expenses).where(eq(expenses.id, valid.expenseId));
      if (existing !== undefined) {
        return yield* requireMatchingExpense(existing, valid, view.group.id);
      }
      const shares = yield* splitEqually(
        valid.amountSats,
        view.participants.map((participant) => participant.id),
      );
      const expense = {
        id: valid.expenseId,
        groupId: view.group.id,
        payerId: valid.payerId,
        description: valid.description,
        amountSats: valid.amountSats,
        date: valid.date,
        version: 1,
      };
      yield* validateTotals(valid.inviteKey, { ...expense, createdAt: "", shares });
      yield* database.insert(expenses).values(expense);
      yield* insertShares(expense.id, shares);
      return expense.id;
    }),
  );
});

const persistReplacement = Effect.fn("persistExpenseReplacement")(function* persistReplacement(
  replacement: ExpenseView,
  version: number,
) {
  const database = yield* Database;
  yield* database
    .update(expenses)
    .set({
      payerId: replacement.payerId,
      description: replacement.description,
      amountSats: replacement.amountSats,
      date: replacement.date,
      version: replacement.version,
    })
    .where(
      and(eq(expenses.id, replacement.id), eq(expenses.groupId, replacement.groupId), eq(expenses.version, version)),
    );
  yield* database.delete(expenseShares).where(eq(expenseShares.expenseId, replacement.id));
  yield* insertShares(replacement.id, replacement.shares);
});

export const editExpense = Effect.fn("editExpense")(function* editExpense(
  input: typeof EditExpense.Type,
): Effect.fn.Return<void, ExpenseFailure, Database> {
  const valid = yield* Schema.decodeUnknownEffect(EditExpense)(input);
  const database = yield* Database;
  yield* database.transaction(() =>
    Effect.gen(function* updateExpense() {
      yield* requireOpenGroup(valid.inviteKey);
      yield* requireParticipant(valid.inviteKey, valid.payerId);
      const original = yield* getExpense(valid.inviteKey, valid.expenseId);
      if (original.version !== valid.version) {
        return yield* new ExpenseError({ message: "Someone changed this expense. Refresh before editing it." });
      }
      const shares = yield* splitEqually(
        valid.amountSats,
        original.shares.map((share) => share.participantId),
      );
      const replacement = {
        ...original,
        payerId: valid.payerId,
        description: valid.description,
        amountSats: valid.amountSats,
        date: valid.date,
        version: valid.version + 1,
        shares,
      };
      yield* validateTotals(valid.inviteKey, replacement);
      yield* persistReplacement(replacement, valid.version);
      return original.id;
    }),
  );
});

export const deleteExpense = Effect.fn("deleteExpense")(function* deleteExpense(
  input: typeof DeleteExpense.Type,
): Effect.fn.Return<void, ExpenseFailure, Database> {
  const valid = yield* Schema.decodeUnknownEffect(DeleteExpense)(input);
  const database = yield* Database;
  yield* database.transaction(() =>
    Effect.gen(function* removeExpense() {
      yield* requireOpenGroup(valid.inviteKey);
      const original = yield* getExpense(valid.inviteKey, valid.expenseId);
      if (original.version !== valid.version) {
        return yield* new ExpenseError({ message: "Someone changed this expense. Refresh before deleting it." });
      }
      yield* database.delete(expenseShares).where(eq(expenseShares.expenseId, original.id));
      yield* database.delete(expenses).where(and(eq(expenses.id, original.id), eq(expenses.groupId, original.groupId)));
      return original.id;
    }),
  );
});

import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { getOverview } from "./balances";
import { Database } from "./database";
import { addExpense, deleteExpense, editExpense, getExpense, listExpenses } from "./expenses";
import { createGroup, getGroup } from "./groups";
import { expenseShares, groups, participants } from "./schema";

const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
const EXPENSE_ID = "00000000-0000-4000-8000-000000000001";
const EXTRA_PARTICIPANT_ID = "00000000-0000-4000-8000-000000000002";

describe("persisted expenses", () => {
  it.effect(
    "persists custom settings, updates balances, and rejects conflicting retries and invalid replacements",
    () =>
      Effect.gen(function* verifyCustomSplits() {
        expect.hasAssertions();
        const database = yield* Database;
        yield* migrate(database, { migrationsFolder: "./drizzle" });
        const created = yield* createGroup({
          name: "Custom",
          organizerName: "Alice",
          participantNames: ["Bob"],
          arkAddress: "tark1ace",
        });
        const view = yield* getGroup(created.inviteKey);
        const bob = yield* Effect.fromNullishOr(view.participants.find((person) => person.name === "Bob"));
        const input = {
          inviteKey: created.inviteKey,
          expenseId: EXPENSE_ID,
          payerId: created.organizerId,
          description: "Dinner",
          amountSats: 101,
          date: "2026-10-02",
          split: {
            mode: "shares",
            entries: [
              { participantId: created.organizerId, value: 1 },
              { participantId: bob.id, value: 2 },
            ],
          } as const,
        };
        yield* addExpense(input);
        yield* addExpense(input);
        yield* addExpense({ ...input, split: { ...input.split, entries: input.split.entries.toReversed() } });
        expect(
          (yield* Effect.flip(
            addExpense({
              ...input,
              split: {
                ...input.split,
                entries: input.split.entries.map((entry) => ({ ...entry, value: entry.value * 2 })),
              },
            }),
          ))._tag,
        ).toBe("ExpenseError");
        const saved = yield* getExpense(created.inviteKey, EXPENSE_ID);
        expect(saved.split).toStrictEqual(input.split);
        expect(saved.shares.find((share) => share.participantId === bob.id)?.amountSats).toBe(67);
        const overview = yield* getOverview(created.inviteKey);
        expect(overview.balances.find((balance) => balance.participantId === created.organizerId)?.settlementSats).toBe(
          67,
        );
        const changed = { mode: "amount", entries: [{ participantId: bob.id, value: 101 }] } as const;
        expect((yield* Effect.flip(addExpense({ ...input, split: changed })))._tag).toBe("ExpenseError");
        expect(
          (yield* Effect.flip(
            editExpense({
              ...input,
              version: 1,
              split: { mode: "amount", entries: [{ participantId: bob.id, value: 100 }] },
            }),
          ))._tag,
        ).toBe("AccountingError");
        expect(
          (yield* Effect.flip(
            editExpense({
              ...input,
              version: 1,
              split: { mode: "equal", entries: [{ participantId: EXTRA_PARTICIPANT_ID, value: 1 }] },
            }),
          ))._tag,
        ).toBe("AccountingError");
        expect(yield* getExpense(created.inviteKey, EXPENSE_ID)).toStrictEqual(saved);
        yield* editExpense({ ...input, version: 1, split: changed });
        const edited = yield* getExpense(created.inviteKey, EXPENSE_ID);
        expect(edited.split).toStrictEqual(changed);
        expect(edited.shares).toStrictEqual([{ participantId: bob.id, amountSats: 101 }]);
        expect(edited.version).toBe(2);
      }).pipe(Effect.provide(TestDatabase)),
  );
  it.effect("creates, retries without duplication, edits, and deletes an expense and its shares", () =>
    Effect.gen(function* verifyExpenseLifecycle() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup({
        name: "Berlin",
        arkAddress: "tark1ace",
        organizerName: "Alice",
        participantNames: ["Bob", "Carol"],
      });
      const input = {
        inviteKey: created.inviteKey,
        expenseId: EXPENSE_ID,
        payerId: created.organizerId,
        description: "Dinner",
        amountSats: 12_000,
        date: "2026-10-01",
      };
      expect(yield* addExpense(input)).toBe(EXPENSE_ID);
      yield* addExpense(input);
      expect(yield* listExpenses(created.inviteKey)).toHaveLength(1);
      const saved = yield* getExpense(created.inviteKey, EXPENSE_ID);
      expect(saved.shares.map((share) => share.amountSats)).toStrictEqual([4000, 4000, 4000]);
      yield* editExpense({ ...input, amountSats: 6000, description: "Lunch", version: 1 });
      const updated = yield* getExpense(created.inviteKey, EXPENSE_ID);
      expect(updated.version).toBe(2);
      expect(updated.shares.map((share) => share.amountSats)).toStrictEqual([2000, 2000, 2000]);
      expect((yield* Effect.flip(editExpense({ ...input, version: 1 })))._tag).toBe("ExpenseError");
      expect(
        (yield* Effect.flip(deleteExpense({ inviteKey: created.inviteKey, expenseId: EXPENSE_ID, version: 1 })))._tag,
      ).toBe("ExpenseError");
      yield* deleteExpense({ inviteKey: created.inviteKey, expenseId: EXPENSE_ID, version: 2 });
      expect(yield* listExpenses(created.inviteKey)).toStrictEqual([]);
      expect(yield* database.select().from(expenseShares)).toStrictEqual([]);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("isolates groups, rejects outside payers, and preserves historical splits on edit", () =>
    Effect.gen(function* verifyExpenseIsolation() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const input = { name: "Berlin", organizerName: "Alice", participantNames: ["Bob"], arkAddress: "tark1ace" };
      const first = yield* createGroup(input);
      const second = yield* createGroup(input);
      const expense = {
        inviteKey: first.inviteKey,
        expenseId: EXPENSE_ID,
        payerId: first.organizerId,
        description: "Dinner",
        amountSats: 100,
        date: "2026-10-01",
      };
      expect((yield* Effect.flip(addExpense({ ...expense, payerId: second.organizerId })))._tag).toBe("GroupError");
      yield* addExpense(expense);
      expect(yield* listExpenses(second.inviteKey)).toStrictEqual([]);
      expect((yield* Effect.flip(getExpense(second.inviteKey, EXPENSE_ID)))._tag).toBe("ExpenseError");
      expect(
        (yield* Effect.flip(
          editExpense({ ...expense, inviteKey: second.inviteKey, payerId: second.organizerId, version: 1 }),
        ))._tag,
      ).toBe("ExpenseError");
      yield* database
        .insert(participants)
        .values({ id: EXTRA_PARTICIPANT_ID, groupId: first.groupId, name: "Carol", nameKey: "carol", position: 2 });
      const view = yield* getGroup(first.inviteKey);
      expect(view.participants).toHaveLength(3);
      yield* editExpense({ ...expense, amountSats: 200, version: 1 });
      const edited = yield* getExpense(first.inviteKey, EXPENSE_ID);
      expect(edited.shares).toHaveLength(2);
      expect(edited.shares.map((share) => share.amountSats)).toStrictEqual([100, 100]);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("blocks expense mutations once settlement starts", () =>
    Effect.gen(function* verifySettlementLock() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup({
        name: "Berlin",
        organizerName: "Alice",
        participantNames: ["Bob"],
        arkAddress: "tark1ace",
      });
      const input = {
        inviteKey: created.inviteKey,
        expenseId: EXPENSE_ID,
        payerId: created.organizerId,
        description: "Dinner",
        amountSats: 100,
        date: "2026-10-01",
      };
      yield* addExpense(input);
      yield* database.update(groups).set({ status: "settling" }).where(eq(groups.id, created.groupId));
      expect((yield* Effect.flip(addExpense({ ...input, expenseId: EXTRA_PARTICIPANT_ID })))._tag).toBe("ExpenseError");
      expect((yield* Effect.flip(editExpense({ ...input, version: 1 })))._tag).toBe("ExpenseError");
      expect(
        (yield* Effect.flip(deleteExpense({ inviteKey: created.inviteKey, expenseId: EXPENSE_ID, version: 1 })))._tag,
      ).toBe("ExpenseError");
      expect(yield* listExpenses(created.inviteKey)).toHaveLength(1);
    }).pipe(Effect.provide(TestDatabase)),
  );
});

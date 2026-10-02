import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { getOverview } from "./balances";
import { Database } from "./database";
import { addExpense, deleteExpense, editExpense } from "./expenses";
import { createGroup } from "./groups";

describe("group overview", () => {
  const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
  it.effect("recalculates persisted balances after each expense mutation", () =>
    Effect.gen(function* verifyOverview() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const group = yield* createGroup({
        name: "Berlin",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob", "Carol"],
        arkAddress: "ark1ace",
      });
      const input = {
        inviteKey: group.inviteKey,
        expenseId: "00000000-0000-4000-8000-000000000001",
        payerId: group.organizerId,
        description: "Dinner",
        amountSats: 12_000,
        date: "2026-10-01",
      };
      expect((yield* getOverview(group.inviteKey)).totalSats).toBe(0);
      yield* addExpense(input);
      const overview = yield* getOverview(group.inviteKey);
      expect(overview.totalSats).toBe(12_000);
      expect(overview.balances.map((balance) => balance.expenseBalanceSats)).toStrictEqual([8000, -4000, -4000]);
      yield* editExpense({ ...input, amountSats: 9000, version: 1 });
      expect((yield* getOverview(group.inviteKey)).balances.map((balance) => balance.expenseBalanceSats)).toStrictEqual(
        [6000, -3000, -3000],
      );
      yield* deleteExpense({ inviteKey: group.inviteKey, expenseId: input.expenseId, version: 2 });
      expect((yield* getOverview(group.inviteKey)).totalSats).toBe(0);
    }).pipe(Effect.provide(TestDatabase)),
  );
});

import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { loadEventSettlement, lockEventSettlement, saveReceivingAddress } from "./event-settlement";
import { addExpense } from "./expenses";
import { createGroup, getGroup } from "./groups";

const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
const fixture = Effect.fn("settlementFixture")(function* fixture() {
  const database = yield* Database;
  yield* migrate(database, { migrationsFolder: "./drizzle" });
  const created = yield* createGroup({
    name: "Dinner",
    organizerName: "Alice",
    participantNames: ["Bob"],
    arkAddress: "ark1ace",
  });
  const expense = {
    inviteKey: created.inviteKey,
    expenseId: "00000000-0000-4000-8000-000000000001",
    payerId: created.organizerId,
    description: "Dinner",
    amountSats: 10_000,
    date: "2026-10-01",
  };
  yield* addExpense(expense);
  return { ...created, expense };
});

describe("event settlement snapshot", () => {
  it.effect("requires organizer access and rolls back an incomplete settlement", () =>
    Effect.gen(function* verifyAccess() {
      expect.hasAssertions();
      const event = yield* fixture();
      expect((yield* Effect.flip(lockEventSettlement(event.inviteKey)))._tag).toBe("GroupError");
      expect((yield* Effect.flip(lockEventSettlement(event.inviteKey, event.organizerToken)))._tag).toBe("GroupError");
      expect((yield* getGroup(event.inviteKey)).group.status).toBe("open");
      expect(yield* loadEventSettlement(event.inviteKey)).toBeNull();
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("freezes net obligations and destinations once, including the owner", () =>
    Effect.gen(function* verifySnapshot() {
      expect.hasAssertions();
      const event = yield* fixture();
      const address = { inviteKey: event.inviteKey, participantId: event.organizerId, lnurl: "alice@wallet.com" };
      yield* saveReceivingAddress(address, event.organizerToken);
      const members = yield* lockEventSettlement(event.inviteKey, event.organizerToken);
      expect(
        members?.map(({ name, payInSats, receiveSats, lnurl }) => ({ name, payInSats, receiveSats, lnurl })),
      ).toStrictEqual([
        { name: "Alice", payInSats: 0, receiveSats: 5000, lnurl: "alice@wallet.com" },
        { name: "Bob", payInSats: 5000, receiveSats: 0, lnurl: null },
      ]);
      expect(yield* lockEventSettlement(event.inviteKey, event.organizerToken)).toStrictEqual(members);
      expect(
        (yield* Effect.flip(saveReceivingAddress({ ...address, lnurl: "new@wallet.com" }, event.organizerToken)))._tag,
      ).toBe("GroupError");
      expect(
        (yield* Effect.flip(addExpense({ ...event.expense, expenseId: "00000000-0000-4000-8000-000000000002" })))._tag,
      ).toBe("ExpenseError");
    }).pipe(Effect.provide(TestDatabase)),
  );
});

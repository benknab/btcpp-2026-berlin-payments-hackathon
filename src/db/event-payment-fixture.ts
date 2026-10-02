import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { lockEventSettlement, saveReceivingAddress } from "./event-settlement";
import { addExpense } from "./expenses";
import { createGroup, getGroup } from "./groups";

export const EventTestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));

export const eventPaymentFixture = Effect.fn("eventPaymentFixture")(function* eventPaymentFixture(
  destination?: string,
) {
  const database = yield* Database;
  yield* migrate(database, { migrationsFolder: "./drizzle" });
  const event = yield* createGroup({
    name: "Dinner",
    organizerName: "Alice",
    participantNames: ["Bob"],
    arkAddress: "tark1ace",
  });
  yield* saveReceivingAddress(
    { inviteKey: event.inviteKey, participantId: event.organizerId, lnurl: destination ?? "alice@wallet.com" },
    event.organizerToken,
  );
  yield* addExpense({
    inviteKey: event.inviteKey,
    expenseId: "00000000-0000-4000-8000-000000000001",
    payerId: event.organizerId,
    amountSats: 10_000,
    description: "Dinner",
    date: "2026-10-01",
  });
  const members = yield* lockEventSettlement(event.inviteKey, event.organizerToken);
  const bob = (yield* getGroup(event.inviteKey)).participants.find((member) => member.name === "Bob");
  if (bob === undefined || members === null) {
    return yield* Effect.die("Missing fixture participant");
  }
  return { ...event, members, bobId: bob.id };
});

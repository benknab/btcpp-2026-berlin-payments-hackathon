import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { createGroup } from "./groups";
import { getSavedEvents } from "./saved-events";

describe("saved event summaries", () => {
  const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
  const input = {
    name: "Dinner",
    organizerName: "Alice",
    organizerLnurl: "alice@wallet.com",
    participantNames: ["Bob"],
    arkAddress: "ark1ace",
  };

  it.effect("returns only the requested events' names and invitation IDs in saved order", () =>
    Effect.gen(function* verifySummaries() {
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const first = yield* createGroup(input);
      const second = yield* createGroup({ ...input, name: "Berlin" });
      yield* createGroup({ ...input, name: "Not saved" });
      expect(yield* getSavedEvents([second.inviteKey, first.inviteKey, second.inviteKey])).toStrictEqual([
        { inviteKey: second.inviteKey, name: "Berlin" },
        { inviteKey: first.inviteKey, name: "Dinner" },
      ]);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("skips unavailable IDs and does not grant lookup by internal IDs or owner tokens", () =>
    Effect.gen(function* verifyAccess() {
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup(input);
      expect(
        yield* getSavedEvents(["0".repeat(64), created.groupId, created.organizerToken, created.inviteKey]),
      ).toStrictEqual([{ inviteKey: created.inviteKey, name: "Dinner" }]);
      expect(yield* getSavedEvents([])).toStrictEqual([]);
    }).pipe(Effect.provide(TestDatabase)),
  );
});

import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { groups } from "./group-schema";
import { createGroup, getGroup } from "./groups";
import { recoverOwner } from "./owner-recovery";

describe("self-declared browser-wallet owner recovery", () => {
  const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));

  it.effect("issues fresh owner access without changing the event, participants, or wallet address", () =>
    Effect.gen(function* verifyRecovery() {
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup({
        name: "Dinner",
        organizerName: "Alice",
        organizerLnurl: "alice@example.com",
        participantNames: ["Bob"],
        arkAddress: "ark1ace",
      });
      const before = yield* getGroup(created.inviteKey);
      const recovered = yield* recoverOwner(created.inviteKey);
      expect(recovered.groupId).toBe(created.groupId);
      expect(recovered.organizerId).toBe(created.organizerId);
      expect(recovered.organizerToken).not.toBe(created.organizerToken);
      const after = yield* getGroup(created.inviteKey, recovered.organizerToken);
      expect(after.isOrganizer).toBe(true);
      expect(after.group).toStrictEqual(before.group);
      expect(after.participants).toStrictEqual(before.participants);
      expect((yield* getGroup(created.inviteKey, created.organizerToken)).isOrganizer).toBe(false);
      expect((yield* getGroup(created.inviteKey)).isOrganizer).toBe(false);
      const again = yield* recoverOwner(created.inviteKey);
      expect((yield* getGroup(created.inviteKey, again.organizerToken)).isOrganizer).toBe(true);
      expect((yield* getGroup(created.inviteKey, recovered.organizerToken)).isOrganizer).toBe(false);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("rejects unknown event links and events without browser wallets", () =>
    Effect.gen(function* verifyUnavailableRecovery() {
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup({
        name: "Dinner",
        organizerName: "Alice",
        organizerLnurl: "alice@example.com",
        participantNames: ["Bob"],
        arkAddress: "ark1ace",
      });
      yield* database.update(groups).set({ arkAddress: null }).where(eq(groups.id, created.groupId));
      expect((yield* Effect.flip(recoverOwner("unknown")))._tag).toBe("GroupError");
      expect((yield* Effect.flip(recoverOwner(created.inviteKey)))._tag).toBe("GroupError");
      expect((yield* getGroup(created.inviteKey, created.organizerToken)).isOrganizer).toBe(true);
    }).pipe(Effect.provide(TestDatabase)),
  );
});

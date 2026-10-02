import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { groups, participants } from "./group-schema";
import { createGroup, getGroup, requireParticipant } from "./groups";

describe("groups and invitation access", () => {
  const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));

  it.effect("persists a group and never exposes tokens or their hashes in the shared view", () =>
    Effect.gen(function* verifyAccess() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup({
        name: "Berlin",
        arkAddress: "ark1ace",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob", "Carol"],
      });
      const shared = yield* getGroup(created.inviteKey);
      const organizer = yield* getGroup(created.inviteKey, created.organizerToken);
      expect(shared.participants.map((participant) => participant.name)).toStrictEqual(["Alice", "Bob", "Carol"]);
      expect(shared.participants.map((participant) => participant.lnurl)).toStrictEqual([
        "alice@wallet.com",
        null,
        null,
      ]);
      expect(shared.isOrganizer).toBe(false);
      expect(shared.group.arkAddress).toBe("ark1ace");
      expect(organizer.isOrganizer).toBe(true);
      expect(shared.group).not.toHaveProperty("organizerTokenHash");
      expect(shared.group).not.toHaveProperty("inviteTokenHash");
      expect(shared.participants).not.toContainEqual(expect.objectContaining({ groupId: created.groupId }));
      expect((yield* getGroup(created.inviteKey, created.inviteKey)).isOrganizer).toBe(false);
      expect((yield* getGroup(created.inviteKey, "fake-token")).isOrganizer).toBe(false);
      yield* requireParticipant(created.inviteKey, created.organizerId);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("rejects unknown invitations and participants from another group", () =>
    Effect.gen(function* verifyIsolation() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const input = {
        name: "Berlin",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob"],
        arkAddress: "ark1ace",
      };
      const first = yield* createGroup(input);
      const second = yield* createGroup(input);
      expect((yield* Effect.flip(getGroup("unknown")))._tag).toBe("GroupError");
      expect((yield* Effect.flip(getGroup(first.groupId)))._tag).toBe("GroupError");
      expect((yield* Effect.flip(requireParticipant(first.inviteKey, second.organizerId)))._tag).toBe("GroupError");
      expect((yield* getGroup(first.inviteKey, second.organizerToken)).isOrganizer).toBe(false);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect.each([
    { name: "Dinner", organizerName: "Alice", participantNames: ["alice"] },
    { name: "Dinner", organizerName: "Alice", participantNames: ["Bob"], participantLnurls: ["invalid"] },
    { name: "Dinner", organizerName: "Alice", participantNames: ["Bob"], participantLnurls: [] },
    {
      name: "Dinner",
      organizerName: "Alice",
      participantNames: ["Bob", "Carol"],
      participantLnurls: ["bob@wallet.com", "lightning:bob@wallet.com"],
    },
  ])("rejects invalid event creation without persisting an event or participants %j", (input) =>
    Effect.gen(function* verifyInvalidCreation() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const result = yield* Effect.flip(
        createGroup({ ...input, organizerLnurl: "alice@wallet.com", arkAddress: "ark1ace" }),
      );
      expect(result._tag).toBe("SchemaError");
      expect(yield* database.select().from(groups)).toStrictEqual([]);
      expect(yield* database.select().from(participants)).toStrictEqual([]);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("persists each person's optional receiving details and returns them on reload", () =>
    Effect.gen(function* verifyReceivingDetails() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createGroup({
        name: "Dinner",
        arkAddress: "ark1ace",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob", "Carol"],
        participantLnurls: [null, "carol@wallet.com"],
      });
      const reloaded = yield* getGroup(created.inviteKey);
      expect(reloaded.participants.map(({ name, lnurl }) => ({ name, lnurl }))).toStrictEqual([
        { name: "Alice", lnurl: "alice@wallet.com" },
        { name: "Bob", lnurl: null },
        { name: "Carol", lnurl: "carol@wallet.com" },
      ]);
    }).pipe(Effect.provide(TestDatabase)),
  );
});

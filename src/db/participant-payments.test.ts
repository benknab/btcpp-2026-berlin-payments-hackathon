import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { expect, it } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { groups } from "./group-schema";
import { createGroup, getGroup } from "./groups";
import { issuePersonalLink, personalPayment, savePersonalAddress } from "./participant-payments";

const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));

it.effect("private capabilities authorize only their participant; rotation revokes the old link", () =>
  Effect.gen(function* test() {
    yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
    const group = yield* createGroup({ name: "Berlin", organizerName: "Alice", participantNames: ["Bob"] });
    const other = yield* createGroup({ name: "Other", organizerName: "Carol", participantNames: ["Dave"] });
    expect(yield* Effect.result(issuePersonalLink(group.inviteKey, group.organizerId))).toMatchObject({
      _tag: "Failure",
    });
    expect(
      yield* Effect.result(issuePersonalLink(group.inviteKey, group.organizerId, other.organizerToken)),
    ).toMatchObject({ _tag: "Failure" });
    expect(
      yield* Effect.result(issuePersonalLink(group.inviteKey, other.organizerId, group.organizerToken)),
    ).toMatchObject({ _tag: "Failure" });
    const first = yield* issuePersonalLink(group.inviteKey, group.organizerId, group.organizerToken);
    expect(yield* Effect.result(personalPayment(group.inviteKey))).toMatchObject({ _tag: "Failure" });
    yield* savePersonalAddress({ accessKey: first.accessKey, arkAddress: "tark1ace" });
    expect((yield* personalPayment(first.accessKey)).name).toBe("Alice");
    const second = yield* issuePersonalLink(group.inviteKey, group.organizerId, group.organizerToken);
    expect(yield* Effect.result(personalPayment(first.accessKey))).toMatchObject({ _tag: "Failure" });
    expect((yield* personalPayment(second.accessKey)).arkAddress).toBe("tark1ace");
    expect(
      yield* Effect.result(savePersonalAddress({ accessKey: second.accessKey, arkAddress: "bc1mainnet" })),
    ).toMatchObject({ _tag: "Failure" });
    yield* (yield* Database).update(groups).set({ status: "settling" }).where(eq(groups.id, group.groupId));
    expect(
      yield* Effect.result(savePersonalAddress({ accessKey: second.accessKey, arkAddress: "tark1q0q" })),
    ).toMatchObject({ _tag: "Failure" });
    expect(
      yield* Effect.result(issuePersonalLink(group.inviteKey, group.organizerId, group.organizerToken)),
    ).toMatchObject({ _tag: "Failure" });
  }).pipe(Effect.provide(TestDatabase)),
);

it.effect("rejects another participant's destination but permits independent groups", () =>
  Effect.gen(function* test() {
    yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
    const group = yield* createGroup({ name: "Berlin", organizerName: "Alice", participantNames: ["Bob"] });
    const other = yield* createGroup({ name: "Other", organizerName: "Carol", participantNames: ["Dave"] });
    const members = yield* getGroup(group.inviteKey);
    const bobId = members.participants.find((person) => person.name === "Bob")?.id;
    if (bobId === undefined) {
      yield* Effect.die("Missing fixture");
      return;
    }
    const aliceLink = yield* issuePersonalLink(group.inviteKey, group.organizerId, group.organizerToken);
    const bobLink = yield* issuePersonalLink(group.inviteKey, bobId, group.organizerToken);
    const carolLink = yield* issuePersonalLink(other.inviteKey, other.organizerId, other.organizerToken);
    yield* savePersonalAddress({ accessKey: aliceLink.accessKey, arkAddress: "tark1ace" });
    expect(
      yield* Effect.result(savePersonalAddress({ accessKey: bobLink.accessKey, arkAddress: "tark1ace" })),
    ).toMatchObject({ _tag: "Failure" });
    yield* savePersonalAddress({ accessKey: carolLink.accessKey, arkAddress: "tark1ace" });
    expect((yield* personalPayment(bobLink.accessKey)).arkAddress).toBeNull();
  }).pipe(Effect.provide(TestDatabase)),
);

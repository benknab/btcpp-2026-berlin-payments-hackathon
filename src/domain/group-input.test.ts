import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { GroupRequest, MAX_PARTICIPANTS, NewGroup } from "./group-input";

describe("group validation", () => {
  it.effect("accepts a group without an email or account", () =>
    Effect.gen(function* verifyGroup() {
      expect.hasAssertions();
      const input = { name: "Berlin weekend", organizerName: "Alice", participantNames: ["Bob", "Carol"] };
      expect(yield* Schema.decodeUnknownEffect(NewGroup)(input)).toStrictEqual(input);
    }),
  );

  it.effect.each([
    { name: "", organizerName: "Alice", participantNames: ["Bob"] },
    { name: "Berlin", organizerName: " Alice ", participantNames: ["Bob"] },
    { name: "Berlin", organizerName: "Alice", participantNames: [] },
    { name: "Berlin", organizerName: "Alice", participantNames: ["alice"] },
    { name: "Berlin", organizerName: "Alice", participantNames: ["Bob", "bob"] },
    { name: "Berlin", organizerName: "Alice", participantNames: Array.from({ length: MAX_PARTICIPANTS }, String) },
  ])("rejects invalid group %j", (input: unknown) =>
    Effect.gen(function* verifyInvalidGroup() {
      expect.hasAssertions();
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(NewGroup)(input)))._tag).toBe("SchemaError");
    }),
  );

  it.effect("rejects malformed invite keys", () =>
    Effect.gen(function* verifyInviteKey() {
      expect.hasAssertions();
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(GroupRequest)({ inviteKey: "guess" })))._tag).toBe(
        "SchemaError",
      );
    }),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { parseSavedEventIds, rememberEventId, SavedEventsRequest } from "./saved-events";

const FIRST = "a".repeat(64);
const SECOND = "b".repeat(64);

describe("saved event IDs", () => {
  it.effect.each([null, "", "broken JSON", "null", "{}", '"event"', '[1, null, "invalid"]'])(
    "handles absent or malformed stored IDs: %j",
    (stored) =>
      Effect.sync(() => {
        expect(parseSavedEventIds(stored)).toStrictEqual([]);
      }),
  );

  it.effect("keeps only valid invitation IDs and removes duplicates without changing order", () =>
    Effect.sync(() => {
      const stored = JSON.stringify([FIRST, "invalid", SECOND, FIRST, null, { name: "Dinner" }]);
      expect(parseSavedEventIds(stored)).toStrictEqual([FIRST, SECOND]);
    }),
  );

  it.effect("remembers created and joined events as IDs only, with the latest first", () =>
    Effect.sync(() => {
      const created = rememberEventId([], FIRST);
      const joined = rememberEventId(created, SECOND);
      expect(joined).toStrictEqual([SECOND, FIRST]);
      expect(rememberEventId(joined, FIRST)).toStrictEqual([FIRST, SECOND]);
      expect(rememberEventId(joined, "invalid")).toStrictEqual(joined);
      expect(created).toStrictEqual([FIRST]);
      expect(parseSavedEventIds(JSON.stringify(joined))).toStrictEqual(joined);
    }),
  );

  it.effect("validates saved-event lookup requests", () =>
    Effect.gen(function* verifyRequest() {
      expect(yield* Schema.decodeUnknownEffect(SavedEventsRequest)({ inviteKeys: [FIRST, SECOND] })).toStrictEqual({
        inviteKeys: [FIRST, SECOND],
      });
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(SavedEventsRequest)({ inviteKeys: ["guess"] })))._tag).toBe(
        "SchemaError",
      );
    }),
  );
});

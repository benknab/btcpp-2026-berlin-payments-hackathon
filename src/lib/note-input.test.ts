import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { MAX_NOTE_LENGTH, NewNote } from "./note-input";

describe("note input", (): void => {
  const decode = Schema.decodeUnknownEffect(NewNote);

  it.effect(
    "accepts a valid note",
    (): Effect.Effect<void, Schema.SchemaError> =>
      Effect.gen(function* validNote() {
        expect.hasAssertions();
        const note = yield* decode({ body: "Hello Berlin" });
        expect(note).toStrictEqual({ body: "Hello Berlin" });
      }),
    { timeout: 1000 },
  );

  it.effect.each(["", " ", " not trimmed ", "x".repeat(MAX_NOTE_LENGTH + 1)])(
    "rejects invalid body %j",
    (body): Effect.Effect<void, typeof NewNote.Type> =>
      Effect.gen(function* invalidBody() {
        expect.hasAssertions();
        const error = yield* Effect.flip(decode({ body }));
        expect(error._tag).toBe("SchemaError");
        expect(error.message).toMatch(/Expected/u);
      }),
    { timeout: 1000 },
  );

  it.effect(
    "rejects non-string input",
    (): Effect.Effect<void, typeof NewNote.Type> =>
      Effect.gen(function* invalidType() {
        expect.hasAssertions();
        const error = yield* Effect.flip(decode({ body: 42 }));
        expect(error._tag).toBe("SchemaError");
        expect(error.message).toMatch(/Expected/u);
      }),
    { timeout: 1000 },
  );
});

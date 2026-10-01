import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { MAX_NOTE_LENGTH, NewNote } from "./note-input";

describe("note input", (): void => {
  const decode = Schema.decodeUnknownSync(NewNote);

  it("accepts a valid note", { timeout: 1000 }, (): void => {
    expect.hasAssertions();
    expect(decode({ body: "Hello Berlin" })).toStrictEqual({ body: "Hello Berlin" });
  });

  it.each(["", " ", " not trimmed ", "x".repeat(MAX_NOTE_LENGTH + 1)])(
    "rejects invalid body %j",
    { timeout: 1000 },
    (body): void => {
      expect.hasAssertions();
      expect(() => decode({ body })).toThrow(/Expected/u);
    },
  );

  it("rejects non-string input", { timeout: 1000 }, (): void => {
    expect.hasAssertions();
    expect(() => decode({ body: 42 })).toThrow(/Expected/u);
  });
});

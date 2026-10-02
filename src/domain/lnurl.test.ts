import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect, Schema } from "effect";

import { Lnurl, MAX_LNURL_LENGTH } from "./lnurl";

function encode(value: string, prefix = "lnurl"): string {
  return bech32.encode(prefix, bech32.toWords(new TextEncoder().encode(value)), MAX_LNURL_LENGTH);
}

const VALID_LNURL = encode("https://wallet.example.com/.well-known/lnurlp/bob");

describe("LNURL receiving details", () => {
  it.effect.each([
    "bob@wallet.example.com",
    "bob+trip@wallet.example.com",
    VALID_LNURL,
    VALID_LNURL.toUpperCase(),
    `lightning:${VALID_LNURL}`,
  ])("accepts %s", (value) =>
    Effect.gen(function* verifyValid() {
      expect.hasAssertions();
      expect(yield* Schema.decodeUnknownEffect(Lnurl)(value)).toBe(value);
    }),
  );

  it.effect.each([
    "",
    "bob",
    "bob@",
    "bob@localhost",
    "bob@-wallet.com",
    "bob@wallet..com",
    " bob@wallet.com ",
    "bob@wallet.com/path",
    "lnurl1invalid",
    `${VALID_LNURL.slice(0, -1)}${VALID_LNURL.endsWith("q") ? "p" : "q"}`,
    `LNURL${VALID_LNURL.slice("lnurl".length)}`,
    encode("https://wallet.example.com", "bc"),
    encode("http://wallet.example.com"),
    encode("ftp://wallet.example.com"),
    encode("https://user:password@wallet.example.com"),
    encode("https://wallet.example.com/#fragment"),
    encode("https://wallet.example.com/\n"),
    encode("not a URL"),
    "a".repeat(MAX_LNURL_LENGTH + 1),
  ])("rejects invalid receiving details %#", (value) =>
    Effect.gen(function* verifyInvalid() {
      expect.hasAssertions();
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(Lnurl)(value)))._tag).toBe("SchemaError");
    }),
  );
});

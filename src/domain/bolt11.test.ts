import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect } from "effect";

import { parseMainnetInvoice } from "./bolt11";

// Parser fixtures deliberately have dummy signatures; Bark verifies signatures before sending.
const WORDS = [
  ...Array.from({ length: 7 }, () => 0),
  1,
  1,
  20,
  ...bech32.toWords(new Uint8Array(32)),
  ...Array.from({ length: 104 }, () => 0),
];

describe("mainnet invoices", () => {
  it.effect("extracts the amount and hash and applies BOLT11's default expiry", () =>
    Effect.sync(() => {
      expect.hasAssertions();
      expect(parseMainnetInvoice(bech32.encode("lnbc50u", WORDS, false))).toStrictEqual({
        paymentHash: "0".repeat(64),
        amountSats: 5000,
        expiresAt: 3_600_000,
      });
    }),
  );
  it.effect.each(["lntbs50u", "lntb50u", "lnbcrt50u", "lnbc", "lnbc1p"])(
    "rejects unsupported invoice %s",
    (prefix: string) =>
      Effect.sync(() => {
        expect.hasAssertions();
        expect(() => parseMainnetInvoice(bech32.encode(prefix, WORDS, false))).toThrow();
      }),
  );
});

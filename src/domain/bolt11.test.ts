import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect } from "effect";

import { parseSignetInvoice } from "./bolt11";

// Parser fixtures deliberately have dummy signatures; Bark verifies signatures before sending.
const WORDS = [
  ...Array.from({ length: 7 }, () => 0),
  1,
  1,
  20,
  ...bech32.toWords(new Uint8Array(32)),
  ...Array.from({ length: 104 }, () => 0),
];

describe("signet invoices", () => {
  it.effect("extracts the amount and hash and applies BOLT11's default expiry", () =>
    Effect.sync(() => {
      expect.hasAssertions();
      expect(parseSignetInvoice(bech32.encode("lntbs50u", WORDS, false))).toStrictEqual({
        paymentHash: "0".repeat(64),
        amountSats: 5000,
        expiresAt: 3_600_000,
      });
    }),
  );
  it.effect.each(["lnbc50u", "lntb50u", "lntbs", "lntbs1p"])("rejects unsupported invoice %s", (prefix: string) =>
    Effect.sync(() => {
      expect.hasAssertions();
      expect(() => parseSignetInvoice(bech32.encode(prefix, WORDS, false))).toThrow();
    }),
  );
});

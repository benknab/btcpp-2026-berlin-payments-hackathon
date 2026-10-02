import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect } from "effect";

import { validateLnurlInvoice } from "./lnurl-pay";
import { PaymentError } from "./payment-error";

const TEST_TIME = 0;
const DESCRIPTION_HASH = "01".repeat(32);
const METADATA_HASH = "02".repeat(32);

// Dummy signatures are sufficient for validation tests; Bark verifies signatures before sending.
function invoice(prefix: string, descriptionHash = false): string {
  const words = [
    ...Array.from({ length: 7 }, () => 0),
    1,
    1,
    20,
    ...bech32.toWords(new Uint8Array(32)),
    ...(descriptionHash ? [23, 1, 20, ...bech32.toWords(new Uint8Array(32).fill(1))] : []),
    ...Array.from({ length: 104 }, () => 0),
  ];
  return bech32.encode(prefix, words, false);
}

const TEST_INVOICE = invoice("lnbc3330n", true);

describe("LNURL-pay invoice validation", () => {
  it.effect("accepts an invoice despite its unrelated description hash", () =>
    Effect.sync(() => {
      const details = validateLnurlInvoice(TEST_INVOICE, 333, TEST_TIME);
      expect(details.amountSats).toBe(333);
      expect(details.descriptionHash).toBe(DESCRIPTION_HASH);
      expect(details.descriptionHash).not.toBe(METADATA_HASH);
      expect(details.expiresAt).toBeGreaterThan(TEST_TIME);
    }),
  );

  it.effect("accepts a valid invoice without a description hash", () =>
    Effect.sync(() => {
      expect(validateLnurlInvoice(invoice("lnbc3330n"), 333, 0).descriptionHash).toBeUndefined();
    }),
  );

  it.effect("rejects an invoice for the wrong payout amount", () =>
    Effect.sync(() => {
      expect(() => validateLnurlInvoice(TEST_INVOICE, 334, TEST_TIME)).toThrow(new PaymentError("lnurlInvoiceAmount"));
    }),
  );

  it.effect("rejects an invoice at its exact expiry", () =>
    Effect.sync(() => {
      const details = validateLnurlInvoice(TEST_INVOICE, 333, TEST_TIME);
      expect(() => validateLnurlInvoice(TEST_INVOICE, 333, details.expiresAt)).toThrow(
        new PaymentError("lnurlInvoiceExpired"),
      );
      expect(() => validateLnurlInvoice(TEST_INVOICE, 333, details.expiresAt + 1)).toThrow(
        new PaymentError("lnurlInvoiceExpired"),
      );
    }),
  );

  it.effect.each(["lntb3330n", "lntbs3330n", "lnbcrt3330n", "lnbc", "lnbc3331p"])(
    "rejects non-mainnet, amountless or fractional-sat invoice %s",
    (prefix) =>
      Effect.sync(() => {
        expect(() => validateLnurlInvoice(invoice(prefix), 333, 0)).toThrow(new PaymentError("lnurlInvoiceInvalid"));
      }),
  );

  it.effect("rejects malformed invoices with a safe diagnostic", () =>
    Effect.sync(() => {
      expect(() => validateLnurlInvoice("invalid invoice", 333, TEST_TIME)).toThrow(
        new PaymentError("lnurlInvoiceInvalid"),
      );
    }),
  );
});

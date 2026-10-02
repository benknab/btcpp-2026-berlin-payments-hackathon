import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect } from "effect";

import { validateLnurlInvoice } from "./lnurl-pay";
import { PaymentError } from "./payment-error";

// Public Primal invoice supplied in the bug report. No preimage or wallet secrets.
const PRIMAL_INVOICE =
  "lnbc3330n1p4tlr50pp522k0zvmqj9fztpzc4ypl6v5g2lt7vwsldg04dc9y9kw6q7jwaasssp5h7ryxfdx9mrpqh2apqcjynx2tcgaftgkccl62955" +
  "clrl968gcjcsxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4" +
  "cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpuhp5acaqrwxk8hkwc8g3w7tpkm2xta2n9vc6m2wjazk923sgvz0rz9mq9qyyssq5dl02vz05" +
  "cvfh57us7qngsy9qnczjqmmlw95pkeahuhj9c22d3m56mzxsuarac6zsu0s3nn03k0le5eemx8f0zlwaaue7d7j323g29sqkc5n86";
const REPORT_TIME = 1_790_938_800_000;
const REPORT_METADATA_HASH = "33d2de0b8b8ac076dcca8e82b29d28e5fb43e26b0718937dfb4be55353144d4f";

// Dummy signatures are sufficient for validation tests; Bark verifies signatures before sending.
function invoice(prefix: string): string {
  const words = [
    ...Array.from({ length: 7 }, () => 0),
    1,
    1,
    20,
    ...bech32.toWords(new Uint8Array(32)),
    ...Array.from({ length: 104 }, () => 0),
  ];
  return bech32.encode(prefix, words, false);
}

describe("LNURL-pay invoice validation", () => {
  it.effect("accepts the reported Primal invoice despite its unrelated description hash", () =>
    Effect.sync(() => {
      const details = validateLnurlInvoice(PRIMAL_INVOICE, 333, REPORT_TIME);
      expect(details.amountSats).toBe(333);
      expect(details.descriptionHash).toBe("ee3a01b8d63decec1d1177961b6d465f5532b31ada9d2e8ac554608609e31176");
      expect(details.descriptionHash).not.toBe(REPORT_METADATA_HASH);
      expect(details.expiresAt).toBeGreaterThan(REPORT_TIME);
    }),
  );

  it.effect("accepts a valid invoice without a description hash", () =>
    Effect.sync(() => {
      expect(validateLnurlInvoice(invoice("lnbc3330n"), 333, 0).descriptionHash).toBeUndefined();
    }),
  );

  it.effect("rejects an invoice for the wrong payout amount", () =>
    Effect.sync(() => {
      expect(() => validateLnurlInvoice(PRIMAL_INVOICE, 334, REPORT_TIME)).toThrow(
        new PaymentError("lnurlInvoiceAmount"),
      );
    }),
  );

  it.effect("rejects an invoice at its exact expiry", () =>
    Effect.sync(() => {
      const details = validateLnurlInvoice(PRIMAL_INVOICE, 333, REPORT_TIME);
      expect(() => validateLnurlInvoice(PRIMAL_INVOICE, 333, details.expiresAt)).toThrow(
        new PaymentError("lnurlInvoiceExpired"),
      );
      expect(() => validateLnurlInvoice(PRIMAL_INVOICE, 333, details.expiresAt + 1)).toThrow(
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
      expect(() => validateLnurlInvoice("invalid invoice", 333, REPORT_TIME)).toThrow(
        new PaymentError("lnurlInvoiceInvalid"),
      );
    }),
  );
});

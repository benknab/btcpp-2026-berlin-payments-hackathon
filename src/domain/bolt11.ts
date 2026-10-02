import { Schema } from "effect";
import { decode } from "light-bolt11-decoder";

import { PositiveSats } from "./money";

const MSATS_PER_SAT = 1000;
const DEFAULT_EXPIRY_SECONDS = 3600;
const Timestamp = Schema.Number.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThan(0)));
export const PaymentHash = Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-f\d]{64}$/u)));
const InvoiceDetails = Schema.Struct({
  paymentHash: PaymentHash,
  amountSats: PositiveSats,
  expiresAt: Timestamp,
});
export type SignetInvoice = typeof InvoiceDetails.Type;
const InvoiceParts = Schema.Struct({
  network: Schema.Literal("tbs"),
  payment_hash: PaymentHash,
  amount: Schema.String,
  timestamp: Schema.Number,
  expiry: Schema.optional(Schema.Number),
});

/** Bark validates the signature when paying; this checks the network, amount, hash and expiry. */
export function parseSignetInvoice(invoice: string): SignetInvoice {
  const decoded = decode(invoice);
  const sections = new Map<string, unknown>();
  for (const section of decoded.sections) {
    if ("value" in section) {
      sections.set(section.name, section.value);
    }
    if (section.name === "coin_network") {
      sections.set("network", section.letters);
    }
  }
  const parts = Schema.decodeUnknownSync(InvoiceParts)(Object.fromEntries(sections));
  return Schema.decodeUnknownSync(InvoiceDetails)({
    paymentHash: parts.payment_hash,
    amountSats: Number(parts.amount) / MSATS_PER_SAT,
    expiresAt: (parts.timestamp + (parts.expiry ?? DEFAULT_EXPIRY_SECONDS)) * MSATS_PER_SAT,
  });
}

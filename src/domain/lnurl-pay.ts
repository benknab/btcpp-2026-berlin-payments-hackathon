import { parseMainnetInvoice } from "./bolt11";
import type { MainnetInvoice } from "./bolt11";
import { PaymentError } from "./payment-error";

function readInvoice(invoice: string): MainnetInvoice {
  try {
    return parseMainnetInvoice(invoice);
  } catch {
    throw new PaymentError("lnurlInvoiceInvalid");
  }
}

/** LUD-06 checks the requested amount, not the legacy metadata/description hash binding.
 * HTTPS supplies the receiving service's invoice; Bark verifies its signature before spending.
 */
export function validateLnurlInvoice(invoice: string, amountSats: number, now: number): MainnetInvoice {
  const details = readInvoice(invoice);
  if (details.amountSats !== amountSats) {
    throw new PaymentError("lnurlInvoiceAmount");
  }
  if (details.expiresAt <= now) {
    throw new PaymentError("lnurlInvoiceExpired");
  }
  return details;
}

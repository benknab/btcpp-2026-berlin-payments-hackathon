const messages = {
  lnurlAddressInvalid: "Invalid Lightning receiving address.",
  lnurlHttpsRequired: "The receiving service must use HTTPS.",
  lnurlUnavailable: "The receiving service is unavailable. Retry or change the receiving address.",
  lnurlResponseInvalid: "The receiving service returned an invalid response. No payment was started.",
  lnurlAmountUnsupported: "The receiving service does not support this payout amount. Change the receiving address.",
  lnurlInvoiceInvalid: "The receiving service returned an invalid mainnet invoice. No payment was started.",
  lnurlInvoiceAmount: "The receiving invoice amount does not match the payout. No payment was started.",
  lnurlInvoiceExpired: "The receiving service returned an expired invoice. No payment was started. Retry.",
  bolt12NotStarted: "The BOLT12 payment did not start. Retry or change the receiving address.",
  bolt12InvoiceTimeout:
    "Bark timed out fetching the BOLT12 invoice. No payment was started. Retry or change the receiving address.",
  payoutUnresolved: "The payout is unresolved. Reconcile it before sending another payment.",
  withdrawalEmpty: "No spendable balance remains after fees.",
  withdrawalPending: "Withdrawal is unresolved. Use Reconcile withdrawal before sending again.",
  withdrawalDestination: "Enter a different wallet's Lightning address, LNURL, Ark address, or BOLT12 offer.",
  withdrawalBusy: "A Lightning payment is still pending. Reconcile it before withdrawing.",
} as const;

/** Only fixed, application-owned messages may pass through the generic action UI. */
export class PaymentError extends Error {
  public readonly _tag = "PaymentError";
  public readonly code: keyof typeof messages;
  public constructor(code: keyof typeof messages) {
    super(messages[code]);
    this.code = code;
    this.name = "PaymentError";
  }
}

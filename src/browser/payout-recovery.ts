import type { EventPayout } from "@/db/event-payment-schema";
import { PaymentError } from "@/domain/payment-error";
import { canReleaseBolt12Claim } from "@/domain/payout-recovery";
import { releasePayout } from "@/server/event-payouts";
import type { Wallet } from "@secondts/bark/web";

import type { BrowserTrace } from "./telemetry";

export async function releaseUnstartedBolt12(
  wallet: Readonly<Wallet>,
  inviteKey: string,
  payout: Readonly<EventPayout>,
  trace: BrowserTrace,
): Promise<boolean> {
  if (payout.method !== "bolt12" || payout.status !== "sending") {
    return false;
  }
  const history = await wallet.history();
  const pending = await wallet.pendingLightningSends();
  if (!canReleaseBolt12Claim(payout, history, pending.length)) {
    return false;
  }
  const historyLastId = Math.max(0, ...history.map((entry) => entry.id));
  await releasePayout({
    data: { inviteKey, paymentHash: payout.paymentHash, historyLastId, pendingSendCount: 0 },
    headers: trace.headers,
  });
  await trace.log("payout.unstarted.released", {
    paymentHash: payout.paymentHash,
    method: payout.method,
    historyLastId,
  });
  return true;
}

export function unstartedBolt12Error(error: unknown): PaymentError {
  const value = error instanceof Error ? error.message : error;
  const message = typeof value === "string" ? value : "";
  return new PaymentError(message.includes("upstream request timeout") ? "bolt12InvoiceTimeout" : "bolt12NotStarted");
}

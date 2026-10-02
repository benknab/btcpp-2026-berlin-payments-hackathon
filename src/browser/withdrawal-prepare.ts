import { parseMainnetInvoice } from "@/domain/bolt11";
import { PaymentError } from "@/domain/payment-error";
import { payoutDestination } from "@/domain/payout-destination";
import { maximumWithdrawal } from "@/domain/withdrawal";
import type { WalletWithdrawal } from "@/domain/withdrawal";
import type { Wallet } from "@secondts/bark/web";
import { Effect } from "effect";

import { resolvePayoutInvoice } from "./lnurl-invoice";
import type { BrowserTrace } from "./telemetry";

export async function prepareWithdrawal(
  wallet: Readonly<Wallet>,
  address: string,
  trace: BrowserTrace,
): Promise<WalletWithdrawal> {
  const destination = payoutDestination(address.trim());
  if (destination === null) {
    throw new PaymentError("withdrawalDestination");
  }
  const pending = await wallet.pendingLightningSends();
  if (pending.length > 0) {
    throw new PaymentError("withdrawalBusy");
  }
  const balance = await wallet.balance();
  const amount = await trace.step("wallet.withdrawal.estimate", {}, () =>
    Effect.runPromise(
      maximumWithdrawal(balance.spendableSats, (sats) =>
        Effect.tryPromise(
          async () =>
            (destination.kind === "ark"
              ? await wallet.estimateArkoorPaymentFee(sats)
              : await wallet.estimateLightningSendFee(sats)
            ).feeSats,
        ),
      ),
    ),
  );
  if (amount.amountSats === 0) {
    throw new PaymentError("withdrawalEmpty");
  }
  const invoice =
    destination.kind === "lnurl"
      ? await resolvePayoutInvoice(destination.value, amount.amountSats, trace)
      : destination.value;
  const history = await wallet.history();
  return {
    id: crypto.randomUUID(),
    destination: address.trim(),
    invoice,
    ...amount,
    method: destination.kind === "lnurl" ? "bolt11" : destination.kind,
    paymentHash: destination.kind === "lnurl" ? parseMainnetInvoice(invoice).paymentHash : null,
    historyStartId: Math.max(0, ...history.map((entry) => entry.id)),
    status: "sending",
  };
}

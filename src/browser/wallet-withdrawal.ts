import { PaymentError } from "@/domain/payment-error";
import type { WalletWithdrawal } from "@/domain/withdrawal";
import { authorizeWithdrawal } from "@/server/wallet-withdrawal";
import type { Wallet } from "@secondts/bark/web";

import { unstartedBolt12Error } from "./payout-recovery";
import type { BrowserTrace } from "./telemetry";
import { withEventWallet } from "./with-event-wallet";
import { prepareWithdrawal } from "./withdrawal-prepare";
import { reconcileWithdrawal, releaseUnstartedWithdrawal } from "./withdrawal-reconcile";
import { readWithdrawal, saveWithdrawal } from "./withdrawal-storage";

async function sendWithdrawal(wallet: Readonly<Wallet>, withdrawal: WalletWithdrawal): Promise<void> {
  if (withdrawal.method === "ark") {
    await wallet.sendArkoorPayment(withdrawal.invoice, withdrawal.amountSats);
  } else if (withdrawal.method === "bolt12") {
    await wallet.payLightningOffer({ offer: withdrawal.invoice, amountSats: withdrawal.amountSats, wait: true });
  } else {
    await wallet.payLightningInvoice({ invoice: withdrawal.invoice, wait: true });
  }
}

async function finishWithdrawal(
  wallet: Readonly<Wallet>,
  arkAddress: string,
  withdrawal: WalletWithdrawal,
  trace: BrowserTrace,
): Promise<WalletWithdrawal> {
  try {
    await trace.step("wallet.withdrawal.reconcile", { withdrawalId: withdrawal.id }, () =>
      reconcileWithdrawal(wallet, withdrawal),
    );
  } catch (error) {
    if (await releaseUnstartedWithdrawal(wallet, arkAddress, withdrawal)) {
      throw unstartedBolt12Error(error);
    }
    throw error;
  }
  const completed = { ...withdrawal, status: "paid" } as const;
  saveWithdrawal(arkAddress, completed);
  await trace.log("wallet.withdrawal.completed", {
    withdrawalId: withdrawal.id,
    amountSats: withdrawal.amountSats,
    feeSats: withdrawal.feeSats,
  });
  return completed;
}

export function withdrawWalletMax(
  inviteKey: string,
  arkAddress: string,
  destination: string,
): Promise<WalletWithdrawal> {
  return withEventWallet(arkAddress, async (wallet, trace) => {
    // Reconcile a persisted attempt before considering any new destination or amount.
    const existing = readWithdrawal(arkAddress);
    if (existing?.status === "sending") {
      return finishWithdrawal(wallet, arkAddress, existing, trace);
    }
    const authorized = await authorizeWithdrawal({ data: { inviteKey }, headers: trace.headers });
    if (authorized.arkAddress !== arkAddress || destination.trim().toLowerCase() === arkAddress.toLowerCase()) {
      throw new PaymentError("withdrawalDestination");
    }
    await trace.step("wallet.sync", {}, () => wallet.sync());
    const withdrawal = await prepareWithdrawal(wallet, destination, trace);
    // Persist before sending; a retry never creates a second payment for an unresolved attempt.
    saveWithdrawal(arkAddress, withdrawal);
    try {
      await trace.step(
        "wallet.withdrawal.send",
        { withdrawalId: withdrawal.id, amountSats: withdrawal.amountSats, method: withdrawal.method },
        () => sendWithdrawal(wallet, withdrawal),
      );
    } catch (error) {
      if (await releaseUnstartedWithdrawal(wallet, arkAddress, withdrawal)) {
        throw unstartedBolt12Error(error);
      }
      throw new PaymentError("withdrawalPending");
    }
    return finishWithdrawal(wallet, arkAddress, withdrawal, trace);
  });
}

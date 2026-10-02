import { PaymentError } from "@/domain/payment-error";
import { matchesPayoutMovement } from "@/domain/payout-movement";
import { canReleaseBolt12Claim } from "@/domain/payout-recovery";
import type { WalletWithdrawal } from "@/domain/withdrawal";
import type { Wallet } from "@secondts/bark/web";

import { receipt } from "./native-event-payout";
import { saveWithdrawal } from "./withdrawal-storage";

export async function reconcileWithdrawal(wallet: Readonly<Wallet>, withdrawal: WalletWithdrawal): Promise<void> {
  if (withdrawal.method === "bolt11" && withdrawal.paymentHash !== null) {
    const status = await wallet.checkLightningPayment({ paymentHash: withdrawal.paymentHash, wait: true });
    if (status.type === "paid") {
      return;
    }
    throw new PaymentError("withdrawalPending");
  }
  const history = await wallet.history();
  const movements = history
    .map((movement) => receipt(movement))
    .filter((movement) => matchesPayoutMovement(withdrawal, movement));
  const [movement] = movements;
  if (movements.length !== 1 || movement === undefined) {
    throw new PaymentError("withdrawalPending");
  }
  if (withdrawal.method === "ark" && movement.status === "successful") {
    return;
  }
  if (withdrawal.method === "bolt12" && movement.paymentHash !== undefined) {
    const status = await wallet.checkLightningPayment({ paymentHash: movement.paymentHash, wait: true });
    if (status.type === "paid") {
      return;
    }
  }
  throw new PaymentError("withdrawalPending");
}

export async function releaseUnstartedWithdrawal(
  wallet: Readonly<Wallet>,
  arkAddress: string,
  withdrawal: WalletWithdrawal,
): Promise<boolean> {
  if (withdrawal.method !== "bolt12") {
    return false;
  }
  const pending = await wallet.pendingLightningSends();
  if (canReleaseBolt12Claim(withdrawal, await wallet.history(), pending.length)) {
    saveWithdrawal(arkAddress, { ...withdrawal, status: "failed" });
    return true;
  }
  return false;
}

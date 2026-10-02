import { PaymentError } from "@/domain/payment-error";
import { matchesPayoutMovement } from "@/domain/payout-movement";
import type { WalletWithdrawal } from "@/domain/withdrawal";
import { withdrawalRelease } from "@/domain/withdrawal-recovery";
import type { WithdrawalRelease } from "@/domain/withdrawal-recovery";
import type { Wallet } from "@secondts/bark/web";

import { receipt } from "./native-event-payout";
import { unstartedBolt12Error } from "./payout-recovery";
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

export async function releaseUnsuccessfulWithdrawal(
  wallet: Readonly<Wallet>,
  arkAddress: string,
  withdrawal: WalletWithdrawal,
): Promise<WithdrawalRelease> {
  const pending = await wallet.pendingLightningSends();
  const history = await wallet.history();
  const released = withdrawalRelease(
    withdrawal,
    history.map((movement) => receipt(movement)),
    pending.length,
  );
  if (released !== null) {
    saveWithdrawal(arkAddress, { ...withdrawal, status: "failed" });
  }
  return released;
}

export function withdrawalFailure(error: unknown, released: WithdrawalRelease): PaymentError {
  if (released === "unstarted") {
    return unstartedBolt12Error(error);
  }
  return new PaymentError(released === "failed" ? "withdrawalFailed" : "withdrawalPending");
}

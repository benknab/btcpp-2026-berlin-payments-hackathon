import type { PayoutMovement } from "./event-payout";
import { matchesPayoutMovement } from "./payout-movement";
import { canReleaseBolt12Claim } from "./payout-recovery";
import type { WalletWithdrawal } from "./withdrawal";

export type WithdrawalRelease = "failed" | "unstarted" | null;

/** A terminal failed movement and no pending checkpoints prove a send is no longer in flight. */
export function withdrawalRelease(
  withdrawal: WalletWithdrawal,
  history: readonly (typeof PayoutMovement.Type)[],
  pendingSendCount: number,
): WithdrawalRelease {
  if (withdrawal.status !== "sending" || pendingSendCount !== 0) {
    return null;
  }
  const matches = history.filter((movement) => {
    if (withdrawal.method !== "bolt11") {
      return matchesPayoutMovement(withdrawal, movement);
    }
    return (
      withdrawal.paymentHash !== null &&
      movement.paymentHash === withdrawal.paymentHash &&
      movement.id > withdrawal.historyStartId &&
      movement.intendedBalanceSats === -withdrawal.amountSats
    );
  });
  if (matches.length === 1 && matches[0]?.status === "failed") {
    return "failed";
  }
  return canReleaseBolt12Claim(withdrawal, history, pendingSendCount) ? "unstarted" : null;
}

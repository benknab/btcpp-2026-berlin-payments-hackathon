import type { EventPayout } from "@/db/event-payment-schema";
import type { PayoutMovement } from "@/domain/event-payout";
import { PaymentError } from "@/domain/payment-error";
import { matchesPayoutMovement } from "@/domain/payout-movement";
import { claimPayout, confirmPayout } from "@/server/event-payouts";
import type { Wallet } from "@secondts/bark/web";

import { releaseUnstartedBolt12, unstartedBolt12Error } from "./payout-recovery";
import type { BrowserTrace } from "./telemetry";

interface WalletMovement {
  readonly id: number;
  readonly status: string;
  readonly intendedBalanceSats: number;
  readonly sentToAddresses: readonly string[];
  readonly lightningOffer?: string | undefined;
  readonly paymentHash?: string | undefined;
}

export function receipt(movement: WalletMovement): typeof PayoutMovement.Type {
  return {
    id: movement.id,
    status: movement.status,
    intendedBalanceSats: movement.intendedBalanceSats,
    sentToAddresses: movement.sentToAddresses,
    ...(movement.lightningOffer === undefined ? {} : { lightningOffer: movement.lightningOffer }),
    ...(movement.paymentHash === undefined ? {} : { paymentHash: movement.paymentHash }),
  };
}

async function payoutMovement(
  wallet: Readonly<Wallet>,
  payout: Readonly<EventPayout>,
): Promise<typeof PayoutMovement.Type> {
  const history = await wallet.history();
  const movements = history
    .map((entry: WalletMovement) => receipt(entry))
    .filter((movement) => matchesPayoutMovement(payout, movement));
  const [movement] = movements;
  if (movements.length !== 1 || movement === undefined) {
    throw new Error("Payout is unresolved. Do not resend; reconcile the wallet history first.");
  }
  return movement;
}

export async function executeNativePayout(
  wallet: Readonly<Wallet>,
  inviteKey: string,
  payout: Readonly<EventPayout>,
  trace: BrowserTrace,
): Promise<void> {
  const history = await wallet.history();
  const data = { inviteKey, paymentHash: payout.paymentHash };
  const claim = await claimPayout({
    data: { ...data, historyStartId: Math.max(0, ...history.map((entry: WalletMovement) => entry.id)) },
    headers: trace.headers,
  });
  if (claim.payout.status === "paid") {
    return;
  }
  if (claim.claimed) {
    try {
      await trace.step<unknown>(
        "wallet.native.send",
        { method: payout.method, amountSats: payout.amountSats, paymentHash: payout.paymentHash },
        () =>
          payout.method === "ark"
            ? wallet.sendArkoorPayment(claim.payout.invoice, claim.payout.amountSats)
            : wallet.payLightningOffer({
                offer: claim.payout.invoice,
                amountSats: claim.payout.amountSats,
                wait: true,
              }),
      );
    } catch (error) {
      if (await releaseUnstartedBolt12(wallet, inviteKey, claim.payout, trace)) {
        throw unstartedBolt12Error(error);
      }
      throw error;
    }
  } else if (await releaseUnstartedBolt12(wallet, inviteKey, claim.payout, trace)) {
    throw new PaymentError("bolt12NotStarted");
  }
  let movement = await payoutMovement(wallet, claim.payout);
  if (payout.method === "ark") {
    if (movement.status !== "successful") {
      throw new Error("Ark payout is unresolved. Reconcile before sending another payment.");
    }
    await confirmPayout({ data: { ...data, movement: receipt(movement) }, headers: trace.headers });
    return;
  }
  if (movement.paymentHash === undefined) {
    throw new Error("BOLT12 payout has no payment hash yet. Reconcile before sending another payment.");
  }
  const { paymentHash } = movement;
  const status = await trace.step("wallet.native.reconcile", { paymentHash }, () =>
    wallet.checkLightningPayment({ paymentHash, wait: true }),
  );
  if (status.type !== "paid") {
    throw new Error("BOLT12 payout is unresolved. Reconcile before sending another payment.");
  }
  movement = await payoutMovement(wallet, claim.payout);
  await confirmPayout({
    data: { ...data, preimage: status.preimage, movement: receipt(movement) },
    headers: trace.headers,
  });
}

import type { EventPayout } from "@/db/event-payment-schema";
import { isEventFunded } from "@/domain/event-funding";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { payoutDestination } from "@/domain/payout-destination";
import { eventPage } from "@/server/event-page";
import { claimPayout, completeEvent, confirmPayout, preparePayout } from "@/server/event-payouts";
import type { Wallet } from "@secondts/bark/web";

import { resolvePayoutInvoice } from "./lnurl-invoice";
import { executeNativePayout } from "./native-event-payout";
import type { BrowserTrace } from "./with-event-wallet";
import { withEventWallet } from "./with-event-wallet";

async function prepareMember(
  inviteKey: string,
  member: EventSettlementMember,
  payouts: readonly EventPayout[],
  trace: BrowserTrace,
): Promise<EventPayout> {
  const existing = payouts.find(
    (payout) => payout.participantId === member.participantId && payout.status !== "expired",
  );
  if (existing !== undefined && (existing.status !== "prepared" || existing.expiresAt > Date.now())) {
    await trace.log("payout.reusing", { paymentHash: existing.paymentHash, status: existing.status });
    return existing;
  }
  if (member.lnurl === null) {
    throw new Error("A creditor is missing their receiving address.");
  }
  const destination = payoutDestination(member.lnurl);
  if (destination === null) {
    throw new Error("Invalid receiving address.");
  }
  const data = { inviteKey, participantId: member.participantId, destination: member.lnurl };
  return destination.kind === "lnurl"
    ? preparePayout({
        data: { ...data, invoice: await resolvePayoutInvoice(destination.value, member.receiveSats, trace) },
        headers: trace.headers,
      })
    : preparePayout({ data, headers: trace.headers });
}

async function executePayout(
  wallet: Readonly<Wallet>,
  inviteKey: string,
  payout: Readonly<EventPayout>,
  trace: BrowserTrace,
): Promise<void> {
  if (payout.status === "paid") {
    return;
  }
  if (payout.method !== "bolt11") {
    await executeNativePayout(wallet, inviteKey, payout, trace);
    return;
  }
  const data = { inviteKey, paymentHash: payout.paymentHash };
  const claim = await claimPayout({ data, headers: trace.headers });
  if (claim.payout.status === "paid") {
    return;
  }
  const fields = {
    paymentHash: payout.paymentHash,
    amountSats: payout.amountSats,
    participantId: payout.participantId,
  };
  const status = claim.claimed
    ? await trace.step("wallet.lightning.send", fields, () =>
        wallet.payLightningInvoice({ invoice: claim.payout.invoice, wait: true }),
      )
    : await trace.step("wallet.lightning.reconcile", fields, () =>
        wallet.checkLightningPayment({ paymentHash: payout.paymentHash, wait: true }),
      );
  await trace.log("payout.lightning.status", { ...fields, status: status.type });
  if (status.type !== "paid") {
    throw new Error("Payout is unresolved. Reconcile it before attempting another payment.");
  }
  await confirmPayout({ data: { ...data, preimage: status.preimage }, headers: trace.headers });
}

async function requirePayoutBalance(
  wallet: Readonly<Wallet>,
  members: readonly EventSettlementMember[],
  trace: BrowserTrace,
): Promise<void> {
  const amounts = await Promise.all(
    members.map(async (member): Promise<number> => {
      const estimate =
        payoutDestination(member.lnurl ?? "")?.kind === "ark"
          ? await wallet.estimateArkoorPaymentFee(member.receiveSats)
          : await wallet.estimateLightningSendFee(member.receiveSats);
      return member.receiveSats + estimate.feeSats;
    }),
  );
  const required = amounts.reduce((total, amount) => total + amount, 0);
  const balance = await wallet.balance();
  await trace.log("payout.balance.checked", {
    requiredSats: required,
    spendableSats: balance.spendableSats,
    creditors: members.length,
  });
  if (balance.spendableSats < required) {
    throw new Error("Fund the event wallet's fee reserve before paying creditors.");
  }
}

async function processPayouts(
  wallet: Readonly<Wallet>,
  input: {
    readonly inviteKey: string;
    readonly members: readonly EventSettlementMember[];
    readonly payouts: readonly EventPayout[];
  },
  trace: BrowserTrace,
): Promise<void> {
  await trace.step("wallet.sync", {}, () => wallet.sync());
  const members = input.members.filter((member) => member.receiveSats > 0);
  const unsent = members.filter(
    (member) =>
      !input.payouts.some(
        (payout) =>
          payout.participantId === member.participantId && (payout.status === "paid" || payout.status === "sending"),
      ),
  );
  await trace.step("payout.fee-reserve", { creditors: unsent.length }, () =>
    requirePayoutBalance(wallet, unsent, trace),
  );
  for (const member of members) {
    // oxlint-disable-next-line no-await-in-loop -- Persist and finish each payment before spending the next set of VTXOs.
    const payout = await trace.step(
      "payout.prepare",
      { participantId: member.participantId, amountSats: member.receiveSats },
      () => prepareMember(input.inviteKey, member, input.payouts, trace),
    );
    // oxlint-disable-next-line no-await-in-loop -- Sequential payouts prevent concurrent wallet spends and stop on unknown outcomes.
    await trace.step("payout.execute", { paymentHash: payout.paymentHash, method: payout.method }, () =>
      executePayout(wallet, input.inviteKey, payout, trace),
    );
  }
}

async function runPayouts(inviteKey: string, wallet: Readonly<Wallet>, trace: BrowserTrace): Promise<void> {
  const page = await eventPage({ data: { inviteKey }, headers: trace.headers });
  if (page.settlement === null || !isEventFunded(page.settlement, page.invoices)) {
    throw new Error("All contributions must be delivered first.");
  }
  await processPayouts(wallet, { inviteKey, members: page.settlement, payouts: page.payouts }, trace);
  if (!(await completeEvent({ data: { inviteKey }, headers: trace.headers }))) {
    throw new Error("Payouts are recorded, but excess contributions still need to be returned.");
  }
}

export function payEventCreditors(inviteKey: string, arkAddress: string): Promise<void> {
  return withEventWallet(arkAddress, (wallet, trace) => runPayouts(inviteKey, wallet, trace));
}

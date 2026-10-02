import type { EventPayout, EventInvoice } from "@/db/event-payment-schema";
import { isEventFunded } from "@/domain/event-funding";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { eventPage } from "@/server/event-page";
import { claimPayout, completeEvent, confirmPayout } from "@/server/event-payouts";
import type { Wallet } from "@secondts/bark/web";

import { requirePayoutBalance, refreshReserveReceipts, unsentCreditors } from "./event-fee-reserve";
import { prepareMember } from "./event-payout-prepare";
import { executeNativePayout } from "./native-event-payout";
import type { BrowserTrace } from "./with-event-wallet";
import { withEventWallet } from "./with-event-wallet";

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

async function processPayouts(
  wallet: Readonly<Wallet>,
  input: {
    readonly inviteKey: string;
    readonly members: readonly EventSettlementMember[];
    readonly payouts: readonly EventPayout[];
    readonly invoices: readonly EventInvoice[];
  },
  trace: BrowserTrace,
): Promise<void> {
  await trace.step("wallet.sync", {}, () => wallet.sync());
  const members = input.members.filter((member) => member.receiveSats > 0);
  const unsent = unsentCreditors(members, input.payouts);
  await trace.step("payout.fee-reserve", { creditors: unsent.length }, () =>
    requirePayoutBalance(wallet, { members: unsent, invoices: input.invoices }, trace),
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
  let page = await eventPage({ data: { inviteKey }, headers: trace.headers });
  for (const payout of page.payouts.filter((entry) => entry.status === "sending")) {
    // oxlint-disable-next-line no-await-in-loop -- Reconcile previous spends before requiring funds for new ones.
    await executePayout(wallet, inviteKey, payout, trace);
  }
  if (page.payouts.some((payout) => payout.status === "sending")) {
    page = await eventPage({ data: { inviteKey }, headers: trace.headers });
  }
  if (await refreshReserveReceipts(inviteKey, page.invoices, trace)) {
    page = await eventPage({ data: { inviteKey }, headers: trace.headers });
  }
  if (page.settlement === null || !isEventFunded(page.settlement, page.invoices)) {
    throw new Error("All contributions must be delivered first.");
  }
  await processPayouts(
    wallet,
    { inviteKey, members: page.settlement, payouts: page.payouts, invoices: page.invoices },
    trace,
  );
  if (!(await completeEvent({ data: { inviteKey }, headers: trace.headers }))) {
    throw new Error("Payouts are recorded, but excess contributions still need to be returned.");
  }
}

export function payEventCreditors(inviteKey: string, arkAddress: string): Promise<void> {
  return withEventWallet(arkAddress, (wallet, trace) => runPayouts(inviteKey, wallet, trace));
}

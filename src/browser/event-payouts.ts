import type { EventPayout } from "@/db/event-payment-schema";
import { isEventFunded } from "@/domain/event-funding";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { eventPage } from "@/server/event-page";
import { claimPayout, completeEvent, confirmPayout, preparePayout } from "@/server/event-payouts";
import type { Wallet } from "@secondts/bark/web";

import { openEventWallet } from "./event-wallet";
import { resolvePayoutInvoice } from "./lnurl-invoice";

async function prepareMember(
  inviteKey: string,
  member: EventSettlementMember,
  payouts: readonly EventPayout[],
): Promise<EventPayout> {
  const existing = payouts.find(
    (payout) => payout.participantId === member.participantId && payout.status !== "expired",
  );
  if (existing !== undefined && (existing.status !== "prepared" || existing.expiresAt > Date.now())) {
    return existing;
  }
  if (member.lnurl === null) {
    throw new Error("A creditor is missing their receiving address.");
  }
  const invoice = await resolvePayoutInvoice(member.lnurl, member.receiveSats);
  return preparePayout({ data: { inviteKey, participantId: member.participantId, invoice } });
}

async function executePayout(
  wallet: Readonly<Wallet>,
  inviteKey: string,
  payout: Readonly<EventPayout>,
): Promise<void> {
  if (payout.status === "paid") {
    return;
  }
  const data = { inviteKey, paymentHash: payout.paymentHash };
  const claim = await claimPayout({ data });
  if (claim.payout.status === "paid") {
    return;
  }
  const status = claim.claimed
    ? await wallet.payLightningInvoice({ invoice: claim.payout.invoice, wait: true })
    : await wallet.checkLightningPayment({ paymentHash: payout.paymentHash, wait: true });
  if (status.type !== "paid") {
    throw new Error("Payout is unresolved. Reconcile it before attempting another payment.");
  }
  await confirmPayout({ data: { ...data, preimage: status.preimage } });
}

async function requirePayoutBalance(
  wallet: Readonly<Wallet>,
  members: readonly EventSettlementMember[],
): Promise<void> {
  const amounts = await Promise.all(
    members.map(async (member): Promise<number> => {
      const estimate = await wallet.estimateLightningSendFee(member.receiveSats);
      return member.receiveSats + estimate.feeSats;
    }),
  );
  const required = amounts.reduce((total, amount) => total + amount, 0);
  const balance = await wallet.balance();
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
): Promise<void> {
  await wallet.sync();
  const members = input.members.filter((member) => member.receiveSats > 0);
  const unsent = members.filter(
    (member) =>
      !input.payouts.some(
        (payout) =>
          payout.participantId === member.participantId && (payout.status === "paid" || payout.status === "sending"),
      ),
  );
  await requirePayoutBalance(wallet, unsent);
  for (const member of members) {
    // oxlint-disable-next-line no-await-in-loop -- Persist and finish each payment before spending the next set of VTXOs.
    const payout = await prepareMember(input.inviteKey, member, input.payouts);
    // oxlint-disable-next-line no-await-in-loop -- Sequential payouts prevent concurrent wallet spends and stop on unknown outcomes.
    await executePayout(wallet, input.inviteKey, payout);
  }
}

async function runPayouts(inviteKey: string, arkAddress: string): Promise<void> {
  const page = await eventPage({ data: { inviteKey } });
  if (page.settlement === null || !isEventFunded(page.settlement, page.invoices)) {
    throw new Error("All contributions must be delivered first.");
  }
  const wallet = await openEventWallet(arkAddress);
  try {
    await processPayouts(wallet, { inviteKey, members: page.settlement, payouts: page.payouts });
    if (!(await completeEvent({ data: { inviteKey } }))) {
      throw new Error("Payouts are recorded, but excess contributions still need to be returned.");
    }
  } finally {
    wallet.free();
  }
}

export function payEventCreditors(inviteKey: string, arkAddress: string): Promise<void> {
  return navigator.locks.request(`bark-event-payout:${arkAddress}`, () => runPayouts(inviteKey, arkAddress));
}

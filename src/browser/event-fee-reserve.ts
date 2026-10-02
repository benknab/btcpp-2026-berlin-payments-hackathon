import type { EventInvoice } from "@/db/event-payment-schema";
import { payoutFundingError, unsentCreditors } from "@/domain/event-fee-reserve";
import { deliveredFeeReserve, isEventFunded } from "@/domain/event-funding";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { PaymentError } from "@/domain/payment-error";
import { payoutDestination } from "@/domain/payout-destination";
import { refreshContributions } from "@/server/event-funding";
import type { EventPageData } from "@/server/event-page";
import type { Wallet } from "@secondts/bark/web";

import { withEventWallet } from "./with-event-wallet";
import type { BrowserTrace } from "./with-event-wallet";

export { unsentCreditors } from "@/domain/event-fee-reserve";

export async function estimatePayoutFees(
  wallet: Readonly<Wallet>,
  members: readonly EventSettlementMember[],
): Promise<number> {
  const fees = await Promise.all(
    members.map(async (member) => {
      const estimate =
        payoutDestination(member.lnurl ?? "")?.kind === "ark"
          ? await wallet.estimateArkoorPaymentFee(member.receiveSats)
          : await wallet.estimateLightningSendFee(member.receiveSats);
      return estimate.feeSats;
    }),
  );
  return fees.reduce((total, fee) => total + fee, 0);
}

export interface FeeReserveEstimate {
  readonly feeSats: number;
  readonly deliveredSats: number;
  readonly depositSats: number;
}

export function estimateEventReserve(arkAddress: string, page: EventPageData): Promise<FeeReserveEstimate> {
  return withEventWallet(arkAddress, async (wallet) => {
    const { invoices, payouts } = page;
    const members = page.settlement ?? [];
    await wallet.sync();
    const feeSats = await estimatePayoutFees(wallet, unsentCreditors(members, payouts));
    const deliveredSats = deliveredFeeReserve(invoices);
    const creditors = unsentCreditors(members, payouts);
    const requiredSats = creditors.reduce((total, member) => total + member.receiveSats, feeSats);
    const balance = await wallet.balance();
    const shortfall = isEventFunded(members, invoices) ? requiredSats - balance.spendableSats : 0;
    return { feeSats, deliveredSats, depositSats: Math.max(0, feeSats - deliveredSats, shortfall) };
  });
}

export async function requirePayoutBalance(
  wallet: Readonly<Wallet>,
  input: {
    readonly members: readonly EventSettlementMember[];
    readonly invoices: readonly EventInvoice[];
  },
  trace: BrowserTrace,
): Promise<void> {
  const feeSats = await estimatePayoutFees(wallet, input.members);
  const payoutSats = input.members.reduce((total, member) => total + member.receiveSats, 0);
  const requiredSats = payoutSats + feeSats;
  const balance = await wallet.balance();
  await trace.log("payout.balance.checked", {
    requiredSats,
    spendableSats: balance.spendableSats,
    creditors: input.members.length,
  });
  const error = payoutFundingError({
    feeSats,
    payoutSats,
    spendableSats: balance.spendableSats,
    invoices: input.invoices,
  });
  if (error !== null) {
    throw new PaymentError(error);
  }
}

export async function refreshReserveReceipts(
  inviteKey: string,
  invoices: readonly EventInvoice[],
  trace: BrowserTrace,
): Promise<boolean> {
  if (
    !invoices.some(
      (invoice) => invoice.purpose === "fee-reserve" && (invoice.status === "pending" || invoice.status === "paid"),
    )
  ) {
    return false;
  }
  await refreshContributions({ data: { inviteKey }, headers: trace.headers });
  return true;
}

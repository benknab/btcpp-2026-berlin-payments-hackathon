import type { EventInvoice } from "@/db/event-payment-schema";

import type { EventSettlementMember } from "./event-settlement";

export function deliveredFor(participantId: string, invoices: readonly EventInvoice[]): number {
  return invoices
    .filter(
      (invoice) =>
        invoice.purpose === "contribution" && invoice.participantId === participantId && invoice.status === "delivered",
    )
    .reduce((total, invoice) => total + invoice.deliveredSats, 0);
}

export function deliveredFeeReserve(invoices: readonly EventInvoice[]): number {
  return invoices
    .filter((invoice) => invoice.purpose === "fee-reserve" && invoice.status === "delivered")
    .reduce((total, invoice) => total + invoice.deliveredSats, 0);
}

export function isEventFunded(members: readonly EventSettlementMember[], invoices: readonly EventInvoice[]): boolean {
  return members.every((member) => deliveredFor(member.participantId, invoices) >= member.payInSats);
}

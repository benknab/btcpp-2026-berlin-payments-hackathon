import { parseMainnetInvoice } from "@/domain/bolt11";
import { deliveredFor } from "@/domain/event-funding";
import type { BarkError } from "@/server/bark/receiver";
import { Receiver } from "@/server/bark/receiver";
import { and, desc, eq } from "drizzle-orm";
import { Clock, Effect } from "effect";

import { Database } from "./database";
import type { EventInvoice } from "./event-payment-schema";
import { loadEventSettlement } from "./event-settlement";
import type { SettlementError } from "./event-settlement";
import { getGroup, GroupError } from "./groups";
import { eventInvoices, groups } from "./schema";

export const loadEventInvoices = Effect.fn("loadEventInvoices")(function* loadEventInvoices(inviteKey: string) {
  const view = yield* getGroup(inviteKey);
  const database = yield* Database;
  return yield* database
    .select()
    .from(eventInvoices)
    .where(eq(eventInvoices.groupId, view.group.id))
    .orderBy(desc(eventInvoices.expiresAt));
});

function receiptStatus(state: string, invoice: Readonly<EventInvoice>, now: number): EventInvoice["status"] {
  if (state === "settled") {
    return "delivered";
  }
  if (state !== "awaiting-payment" || invoice.status === "paid") {
    return "paid";
  }
  return invoice.expiresAt <= now ? "expired" : "pending";
}

const applyReceipt = Effect.fn("applyEventReceipt")(function* applyReceipt(
  invoice: Readonly<EventInvoice>,
  status: EventInvoice["status"],
  amountSats: number,
) {
  const database = yield* Database;
  yield* database.transaction(() =>
    Effect.gen(function* updateReceipt() {
      const changed = yield* database
        .update(eventInvoices)
        .set({ status, deliveredSats: status === "delivered" ? amountSats : 0 })
        .where(and(eq(eventInvoices.paymentHash, invoice.paymentHash), eq(eventInvoices.status, invoice.status)))
        .returning({ paymentHash: eventInvoices.paymentHash });
      if (changed.length === 1 && status === "delivered") {
        // A receipt discovered after completion is an excess contribution, requiring a refund.
        yield* database
          .update(groups)
          .set({ status: "settling" })
          .where(and(eq(groups.id, invoice.groupId), eq(groups.status, "settled")));
      }
    }),
  );
});

const reconcileInvoice = Effect.fn("reconcileEventInvoice")(function* reconcileInvoice(
  invoice: Readonly<EventInvoice>,
) {
  const receiver = yield* Receiver;
  const now = yield* Clock.currentTimeMillis;
  const receipt = yield* receiver.receipt(invoice.paymentHash);
  if (receipt.paymentHash !== invoice.paymentHash || receipt.amountSat > invoice.amountSats) {
    yield* new GroupError({ message: "The receiving wallet returned mismatched payment details." });
    return;
  }
  const status = receiptStatus(receipt.state, invoice, now);
  yield* applyReceipt(invoice, status, receipt.amountSat);
  yield* Effect.logInfo("contribution.reconciled", {
    groupId: invoice.groupId,
    participantId: invoice.participantId,
    paymentHash: invoice.paymentHash,
    previousStatus: invoice.status,
    status,
    amountSats: receipt.amountSat,
    delivered: status === "delivered",
  });
});

export const reconcileEventInvoices = Effect.fn("reconcileEventInvoices")(function* reconcileEventInvoices(
  inviteKey: string,
) {
  const invoices = yield* loadEventInvoices(inviteKey);
  yield* Effect.logInfo("contributions.reconciling", {
    total: invoices.length,
    outstanding: invoices.filter((entry) => entry.status !== "delivered").length,
  });
  yield* Effect.forEach(
    invoices.filter((entry) => entry.status !== "delivered"),
    reconcileInvoice,
    { concurrency: 1 },
  );
  return yield* loadEventInvoices(inviteKey);
});

const saveInvoice = Effect.fn("saveEventInvoice")(function* saveInvoice(input: {
  readonly groupId: string;
  readonly participantId: string;
  readonly address: string;
  readonly amountSats: number;
}) {
  const receiver = yield* Receiver;
  const database = yield* Database;
  const invoice = yield* receiver.invoice(input.address, input.amountSats);
  const details = yield* Effect.try({
    try: () => parseMainnetInvoice(invoice),
    catch: () => new GroupError({ message: "Invalid mainnet invoice." }),
  });
  const now = yield* Clock.currentTimeMillis;
  if (details.amountSats !== input.amountSats || details.expiresAt <= now) {
    return yield* new GroupError({ message: "The receiving invoice has the wrong amount or has expired." });
  }
  const row: EventInvoice = {
    ...details,
    invoice,
    groupId: input.groupId,
    participantId: input.participantId,
    status: "pending",
    deliveredSats: 0,
  };
  yield* database.insert(eventInvoices).values(row);
  yield* Effect.logInfo("contribution.persisted", {
    groupId: input.groupId,
    participantId: input.participantId,
    paymentHash: details.paymentHash,
    amountSats: input.amountSats,
    expiresAt: details.expiresAt,
  });
  return row;
});

const contributionContext = Effect.fn("eventContributionContext")(function* contributionContext(
  inviteKey: string,
  participantId: string,
) {
  const view = yield* getGroup(inviteKey);
  const members = yield* loadEventSettlement(inviteKey);
  const member = members?.find((entry) => entry.participantId === participantId);
  if (
    view.group.status !== "settling" ||
    view.group.arkAddress === null ||
    member === undefined ||
    member.payInSats === 0
  ) {
    return yield* new GroupError({ message: "This participant has no outstanding contribution." });
  }
  return { groupId: view.group.id, address: view.group.arkAddress, member };
});

export const contributionInvoice = Effect.fn("contributionInvoice")(function* contributionInvoice(
  inviteKey: string,
  participantId: string,
): Effect.fn.Return<EventInvoice, SettlementError | BarkError, Database | Receiver> {
  yield* reconcileEventInvoices(inviteKey);
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* prepareInvoice() {
      const { groupId, address, member } = yield* contributionContext(inviteKey, participantId);
      const invoices = yield* loadEventInvoices(inviteKey);
      const existing = invoices.find(
        (invoice) =>
          invoice.participantId === participantId && (invoice.status === "pending" || invoice.status === "paid"),
      );
      if (existing !== undefined) {
        yield* Effect.logInfo("contribution.reused", {
          groupId,
          participantId,
          paymentHash: existing.paymentHash,
          status: existing.status,
        });
        return existing;
      }
      const amountSats = member.payInSats - deliveredFor(participantId, invoices);
      if (amountSats <= 0) {
        return yield* new GroupError({ message: "This contribution has already been delivered." });
      }
      return yield* saveInvoice({ groupId, participantId, address, amountSats });
    }),
  );
});

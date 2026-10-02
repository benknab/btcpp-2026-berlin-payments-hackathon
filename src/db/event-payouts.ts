import { parseSignetInvoice } from "@/domain/bolt11";
import type { PrepareEventPayout, EventPayoutRequest, ConfirmEventPayout } from "@/domain/event-payout";
import { verifiesPaymentPreimage } from "@/server/payment-proof";
import { and, desc, eq, ne } from "drizzle-orm";
import { Clock, Effect } from "effect";

import { Database } from "./database";
import { eventPayouts } from "./event-payment-schema";
import type { EventPayout } from "./event-payment-schema";
import { requirePayoutContext } from "./event-payout-access";
import { getGroup, GroupError } from "./groups";

export const loadEventPayouts = Effect.fn("loadEventPayouts")(function* loadEventPayouts(inviteKey: string) {
  const view = yield* getGroup(inviteKey);
  const database = yield* Database;
  return yield* database
    .select()
    .from(eventPayouts)
    .where(eq(eventPayouts.groupId, view.group.id))
    .orderBy(desc(eventPayouts.expiresAt));
});

const existingPayout = Effect.fn("existingEventPayout")(function* existingPayout(
  groupId: string,
  participantId: string,
) {
  const database = yield* Database;
  const [row] = yield* database
    .select()
    .from(eventPayouts)
    .where(
      and(
        eq(eventPayouts.groupId, groupId),
        eq(eventPayouts.participantId, participantId),
        ne(eventPayouts.status, "expired"),
      ),
    );
  const now = yield* Clock.currentTimeMillis;
  if (row?.status === "prepared" && row.expiresAt <= now) {
    yield* database
      .update(eventPayouts)
      .set({ status: "expired" })
      .where(eq(eventPayouts.paymentHash, row.paymentHash));
    return null;
  }
  return row;
});

const insertPayout = Effect.fn("insertEventPayout")(function* insertPayout(input: {
  readonly groupId: string;
  readonly participantId: string;
  readonly invoice: string;
  readonly amountSats: number;
}) {
  const database = yield* Database;
  const details = yield* Effect.try({
    try: () => parseSignetInvoice(input.invoice),
    catch: () => new GroupError({ message: "Invalid signet payout invoice." }),
  });
  const now = yield* Clock.currentTimeMillis;
  if (details.amountSats !== input.amountSats || details.expiresAt <= now) {
    return yield* new GroupError({ message: "Payout invoice amount or expiry does not match settlement." });
  }
  const row: EventPayout = {
    groupId: input.groupId,
    participantId: input.participantId,
    invoice: input.invoice,
    paymentHash: details.paymentHash,
    amountSats: details.amountSats,
    expiresAt: details.expiresAt,
    status: "prepared",
  };
  yield* database.insert(eventPayouts).values(row);
  return row;
});

export const prepareEventPayout = Effect.fn("prepareEventPayout")(function* prepareEventPayout(
  input: typeof PrepareEventPayout.Type,
  token: string | undefined,
) {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* prepare() {
      const context = yield* requirePayoutContext(input.inviteKey, token);
      const member = context.members.find((entry) => entry.participantId === input.participantId);
      if (member === undefined || member.receiveSats === 0 || member.lnurl === null) {
        return yield* new GroupError({ message: "This participant has no payout." });
      }
      const existing = yield* existingPayout(context.group.id, input.participantId);
      return (
        existing ??
        (yield* insertPayout({
          groupId: context.group.id,
          participantId: input.participantId,
          invoice: input.invoice,
          amountSats: member.receiveSats,
        }))
      );
    }),
  );
});

export const claimEventPayout = Effect.fn("claimEventPayout")(function* claimEventPayout(
  input: typeof EventPayoutRequest.Type,
  token: string | undefined,
) {
  const context = yield* requirePayoutContext(input.inviteKey, token);
  const database = yield* Database;
  const now = yield* Clock.currentTimeMillis;
  const [row] = yield* database
    .select()
    .from(eventPayouts)
    .where(and(eq(eventPayouts.groupId, context.group.id), eq(eventPayouts.paymentHash, input.paymentHash)));
  if (row === undefined || row.status === "expired" || (row.status === "prepared" && row.expiresAt <= now)) {
    return yield* new GroupError({ message: "Payout invoice unavailable or expired." });
  }
  const changed = yield* database
    .update(eventPayouts)
    .set({ status: "sending" })
    .where(and(eq(eventPayouts.paymentHash, row.paymentHash), eq(eventPayouts.status, "prepared")))
    .returning();
  return { claimed: changed.length === 1, payout: changed[0] ?? row };
});

export const confirmEventPayout = Effect.fn("confirmEventPayout")(function* confirmEventPayout(
  input: typeof ConfirmEventPayout.Type,
  token: string | undefined,
) {
  const context = yield* requirePayoutContext(input.inviteKey, token);
  if (!verifiesPaymentPreimage(input.paymentHash, input.preimage)) {
    yield* new GroupError({ message: "The payment proof does not match the payout." });
    return;
  }
  const database = yield* Database;
  const changed = yield* database
    .update(eventPayouts)
    .set({ status: "paid" })
    .where(
      and(
        eq(eventPayouts.groupId, context.group.id),
        eq(eventPayouts.paymentHash, input.paymentHash),
        eq(eventPayouts.status, "sending"),
      ),
    )
    .returning();
  if (changed.length === 0) {
    const rows = yield* loadEventPayouts(input.inviteKey);
    if (!rows.some((row) => row.paymentHash === input.paymentHash && row.status === "paid")) {
      yield* new GroupError({ message: "This payout was not started." });
    }
  }
});

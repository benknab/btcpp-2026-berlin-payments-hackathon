import type { PrepareEventPayout, EventPayoutRequest, ConfirmEventPayout } from "@/domain/event-payout";
import { and, desc, eq, ne } from "drizzle-orm";
import { Clock, Effect } from "effect";

import { Database } from "./database";
import { eventPayouts } from "./event-payment-schema";
import { requirePayoutContext } from "./event-payout-access";
import { insertPayout } from "./event-payout-insert";
import { payoutReceipt } from "./event-payout-proof";
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
          destination: member.lnurl,
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
  if (row.method !== "bolt11" && row.status === "prepared" && input.historyStartId === undefined) {
    return yield* new GroupError({ message: "Record the wallet history boundary before sending." });
  }
  const changed = yield* database
    .update(eventPayouts)
    .set({ status: "sending", historyStartId: input.historyStartId ?? null })
    .where(and(eq(eventPayouts.paymentHash, row.paymentHash), eq(eventPayouts.status, "prepared")))
    .returning();
  return { claimed: changed.length === 1, payout: changed[0] ?? row };
});

export const confirmEventPayout = Effect.fn("confirmEventPayout")(function* confirmEventPayout(
  input: typeof ConfirmEventPayout.Type,
  token: string | undefined,
) {
  const context = yield* requirePayoutContext(input.inviteKey, token);
  const database = yield* Database;
  const [row] = yield* database
    .select()
    .from(eventPayouts)
    .where(and(eq(eventPayouts.groupId, context.group.id), eq(eventPayouts.paymentHash, input.paymentHash)));
  if (row === undefined || (row.status !== "sending" && row.status !== "paid")) {
    yield* new GroupError({ message: "This payout was not started." });
    return;
  }
  const receipt = yield* payoutReceipt(row, input);
  if (row.status === "paid") {
    return;
  }
  const changed = yield* database
    .update(eventPayouts)
    .set({ status: "paid", ...receipt })
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
    if (!rows.some((entry) => entry.paymentHash === input.paymentHash && entry.status === "paid")) {
      yield* new GroupError({ message: "This payout was not started." });
    }
  }
});

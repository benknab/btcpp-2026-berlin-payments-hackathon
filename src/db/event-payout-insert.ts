import { parseSignetInvoice } from "@/domain/bolt11";
import { payoutDestination } from "@/domain/payout-destination";
import type { PayoutDestination } from "@/domain/payout-destination";
import { hex } from "@scure/base";
import { Clock, Effect } from "effect";

import { Database } from "./database";
import { eventPayouts } from "./event-payment-schema";
import { GroupError } from "./groups";

interface PayoutInput {
  readonly groupId: string;
  readonly participantId: string;
  readonly invoice: string | undefined;
  readonly destination: string;
  readonly amountSats: number;
}
const INTENT_ID_BYTES = 32;

const nativePayout = Effect.fn("insertNativeEventPayout")(function* nativePayout(
  input: PayoutInput,
  destination: PayoutDestination,
) {
  if (input.invoice !== undefined || destination.kind === "lnurl") {
    return yield* new GroupError({ message: "Native payouts use the locked receiving address." });
  }
  const database = yield* Database;
  const [row] = yield* database
    .insert(eventPayouts)
    .values({
      groupId: input.groupId,
      participantId: input.participantId,
      method: destination.kind,
      invoice: destination.value,
      paymentHash: hex.encode(crypto.getRandomValues(new Uint8Array(INTENT_ID_BYTES))),
      amountSats: input.amountSats,
      expiresAt: Number.MAX_SAFE_INTEGER,
    })
    .returning();
  if (row === undefined) {
    return yield* new GroupError({ message: "Could not prepare payout." });
  }
  return row;
});

const lightningPayout = Effect.fn("insertLightningEventPayout")(function* lightningPayout(input: PayoutInput) {
  const { invoice } = input;
  if (invoice === undefined) {
    return yield* new GroupError({ message: "A Lightning payout invoice is required." });
  }
  const details = yield* Effect.try({
    try: () => parseSignetInvoice(invoice),
    catch: () => new GroupError({ message: "Invalid signet payout invoice." }),
  });
  const now = yield* Clock.currentTimeMillis;
  if (details.amountSats !== input.amountSats || details.expiresAt <= now) {
    return yield* new GroupError({ message: "Payout invoice amount or expiry does not match settlement." });
  }
  const database = yield* Database;
  const [row] = yield* database
    .insert(eventPayouts)
    .values({
      groupId: input.groupId,
      participantId: input.participantId,
      invoice,
      paymentHash: details.paymentHash,
      amountSats: details.amountSats,
      expiresAt: details.expiresAt,
    })
    .returning();
  if (row === undefined) {
    return yield* new GroupError({ message: "Could not prepare payout." });
  }
  return row;
});

export const insertPayout = Effect.fn("insertEventPayout")(function* insertPayout(input: PayoutInput) {
  const destination = payoutDestination(input.destination);
  if (destination === null) {
    return yield* new GroupError({ message: "Invalid receiving address." });
  }
  return yield* destination.kind === "lnurl" ? lightningPayout(input) : nativePayout(input, destination);
});

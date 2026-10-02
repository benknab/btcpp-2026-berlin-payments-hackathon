import type { EventPayout } from "@/db/event-payment-schema";
import { Schema } from "effect";

import type { PayoutMovement } from "./event-payout";
import { payoutDestination } from "./payout-destination";

const ArkPaymentMethod = Schema.fromJsonString(Schema.Struct({ type: Schema.Literal("ark"), value: Schema.String }));

function arkRecipient(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    // The FFI serializes PaymentMethod as JSON, despite the sentToAddresses name.
    return Schema.decodeUnknownSync(ArkPaymentMethod)(value).value.toLowerCase();
  } catch {
    return null;
  }
}

/** Native payout receipts are organizer-attested wallet history, not independently verified Ark proofs. */
export function matchesPayoutMovement(payout: Readonly<EventPayout>, movement: typeof PayoutMovement.Type): boolean {
  if (
    payout.historyStartId === null ||
    movement.id <= payout.historyStartId ||
    movement.intendedBalanceSats !== -payout.amountSats
  ) {
    return false;
  }
  const destination = payoutDestination(payout.invoice);
  if (destination?.kind === "ark" && payout.method === "ark") {
    return movement.sentToAddresses.length === 1 && arkRecipient(movement.sentToAddresses[0]) === destination.value;
  }
  return (
    destination?.kind === "bolt12" &&
    payout.method === "bolt12" &&
    movement.lightningOffer?.toLowerCase() === destination.value
  );
}

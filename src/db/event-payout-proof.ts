import type { ConfirmEventPayout } from "@/domain/event-payout";
import { matchesPayoutMovement } from "@/domain/payout-movement";
import { verifiesPaymentPreimage } from "@/server/payment-proof";
import { Effect } from "effect";

import type { EventPayout } from "./event-payment-schema";
import { GroupError } from "./groups";

export const payoutReceipt = Effect.fn("verifyEventPayoutReceipt")(function* payoutReceipt(
  row: Readonly<EventPayout>,
  input: typeof ConfirmEventPayout.Type,
) {
  const { movement } = input;
  const proofHash = row.method === "bolt11" ? row.paymentHash : movement?.paymentHash;
  const validMovement = movement?.status === "successful" && matchesPayoutMovement(row, movement);
  const validProof =
    input.preimage !== undefined && proofHash !== undefined && verifiesPaymentPreimage(proofHash, input.preimage);
  if ((row.method !== "bolt11" && !validMovement) || (row.method !== "ark" && !validProof)) {
    return yield* new GroupError({ message: "The payment proof does not match the payout." });
  }
  const receipt = {
    movementId: row.method === "bolt11" ? null : (movement?.id ?? null),
    proofPaymentHash: proofHash ?? null,
  };
  if (
    row.status === "paid" &&
    row.method !== "bolt11" &&
    (row.movementId !== receipt.movementId || row.proofPaymentHash !== receipt.proofPaymentHash)
  ) {
    return yield* new GroupError({ message: "This payout already has a different receipt." });
  }
  return receipt;
});

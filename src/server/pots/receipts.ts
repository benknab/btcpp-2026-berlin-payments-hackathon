import { PotError } from "@/lib/pot";
import type { Pot, PotParticipant } from "@/lib/pot";
import type { BarkMovement } from "@/server/bark/service";

export function uniqueHistory(history: readonly BarkMovement[]): readonly BarkMovement[] {
  return [...new Map(history.map((movement): [number, BarkMovement] => [movement.id, movement])).values()];
}

export function withReceipts(pot: Pot, history: readonly BarkMovement[]): Pot {
  const movements = uniqueHistory(history).filter((movement): boolean => movement.status === "successful");
  return {
    ...pot,
    participants: pot.participants.map((participant): PotParticipant => {
      const receipts = movements.flatMap((movement) => {
        let amountSat = 0;
        for (const received of movement.receivedOn) {
          if (received.destination.type === "ark" && received.destination.value === participant.depositAddress) {
            amountSat += received.amountSat;
          }
        }
        return amountSat > 0 ? [{ id: movement.id, amountSat }] : [];
      });
      const receivedSat = receipts.reduce(
        (sum, receipt: Readonly<{ amountSat: number }>): number => sum + receipt.amountSat,
        0,
      );
      if (!Number.isSafeInteger(receivedSat)) {
        throw new PotError({ message: "Receipt totals exceed safe integer sats" });
      }
      return {
        ...participant,
        receivedSat,
        receiptMovementIds: receipts.map((receipt: Readonly<{ id: number }>): number => receipt.id),
      };
    }),
  };
}

export function receivedAt(address: string, history: readonly BarkMovement[]): number {
  let total = 0;
  for (const movement of uniqueHistory(history)) {
    if (movement.status === "successful") {
      for (const receipt of movement.receivedOn) {
        if (receipt.destination.type === "ark" && receipt.destination.value === address) {
          total += receipt.amountSat;
        }
      }
    }
  }
  return total;
}

export function payoutMovement(
  participant: PotParticipant,
  history: readonly BarkMovement[],
): BarkMovement | undefined {
  return uniqueHistory(history).find(
    (movement): boolean =>
      movement.id > participant.payoutHistoryCursor &&
      movement.status === "successful" &&
      movement.sentTo.some(
        (sent): boolean =>
          sent.destination.type === "ark" &&
          sent.destination.value === participant.payoutAddress &&
          sent.amountSat === participant.receiveSat,
      ),
  );
}

export function updateParticipant(pot: Pot, participant: PotParticipant): Pot {
  return {
    ...pot,
    participants: pot.participants.map((current): PotParticipant =>
      current.userId === participant.userId ? participant : current,
    ),
  };
}

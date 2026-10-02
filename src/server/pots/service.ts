import { calculateObligations, PotError, PotInputSchema } from "@/lib/pot";
import type { Pot, PotParticipant } from "@/lib/pot";
import { Bark } from "@/server/bark/service";
import type { BarkMovement } from "@/server/bark/service";
import { Effect, Schema } from "effect";

import { payoutMovement, updateParticipant, withReceipts } from "./receipts";
import { PotStore } from "./store";

const checkWallet = Effect.fn("checkPotWallet")(function* checkWallet(pot: Pot) {
  const bark = yield* Bark;
  if ((yield* bark.fingerprint()) !== pot.walletFingerprint) {
    yield* new PotError({ message: "Bark wallet does not match this pot" });
  }
});

export const createPot = Effect.fn("createPot")(function* createPot(value: unknown) {
  const input = yield* Schema.decodeUnknownEffect(PotInputSchema)(value);
  const obligations = yield* calculateObligations(input);
  const bark = yield* Bark;
  const store = yield* PotStore;
  const walletFingerprint = yield* bark.fingerprint();
  const participants = yield* Effect.forEach(
    obligations,
    (obligation) =>
      Effect.gen(function* participant() {
        const user = input.users.find((candidate): boolean => candidate.id === obligation.userId);
        if (user === undefined) {
          return yield* new PotError({ message: "Participant missing" });
        }
        return {
          ...obligation,
          name: user.name,
          payoutAddress: user.arkAddress,
          depositAddress: yield* bark.address(),
          receivedSat: 0,
          receiptMovementIds: [],
          payoutStatus: obligation.receiveSat === 0 ? "not-needed" : "pending",
          payoutHistoryCursor: 0,
          payoutMovementId: null,
        } satisfies PotParticipant;
      }),
    { concurrency: 1 },
  );
  const totalSat = participants.reduce((sum, participant: PotParticipant): number => sum + participant.payInSat, 0);
  return yield* store.insert({
    id: input.id,
    walletFingerprint,
    revision: 0,
    status: totalSat === 0 ? "settled" : "collecting",
    totalSat,
    participants,
  });
});

export const confirmPot = Effect.fn("confirmPot")(function* confirmPot(id: string) {
  const store = yield* PotStore;
  const pot = yield* store.get(id);
  yield* checkWallet(pot);
  if (pot.status !== "collecting") {
    return pot;
  }
  const bark = yield* Bark;
  yield* bark.sync();
  const history = yield* bark.history();
  const confirmed = yield* Effect.try({
    try: (): Pot => withReceipts(pot, history),
    catch: (): PotError => new PotError({ message: "Invalid receipt totals" }),
  });
  return yield* store.save(confirmed);
});

const confirmPayout = Effect.fn("confirmPayout")(function* confirmPayout(pot: Pot, participant: PotParticipant) {
  const bark = yield* Bark;
  const store = yield* PotStore;
  yield* bark.sync();
  const movement = payoutMovement(participant, yield* bark.history());
  if (movement === undefined) {
    return yield* new PotError({
      message: `Payout for ${participant.userId} is unconfirmed; inspect Bark history before any manual retry`,
    });
  }
  return yield* store.save(
    updateParticipant(pot, {
      ...participant,
      payoutStatus: "paid",
      payoutMovementId: movement.id,
    }),
  );
});

function historyCursor(history: readonly BarkMovement[]): number {
  let cursor = 0;
  for (const movement of history) { cursor = Math.max(cursor, movement.id); }
  return cursor;
}

const payParticipant = Effect.fn("payParticipant")(function* payParticipant(pot: Pot, participant: PotParticipant) {
  if (participant.payoutStatus === "sending") {
    return yield* confirmPayout(pot, participant);
  }
  const bark = yield* Bark;
  const store = yield* PotStore;
  const history = yield* bark.history();
  const payoutHistoryCursor = historyCursor(history);
  const sending = {
    ...participant,
    payoutStatus: "sending",
    payoutHistoryCursor,
  } satisfies PotParticipant;
  // Persist intent before touching money. Never automatically re-send a persisted attempt.
  const saved = yield* store.save(updateParticipant({ ...pot, status: "paying" }, sending));
  yield* bark.send(sending.payoutAddress, sending.receiveSat);
  return yield* confirmPayout(saved, sending);
});

const reconcilePayouts = Effect.fn("reconcilePayouts")(function* reconcilePayouts(initial: Pot) {
  let pot = initial;
  // Reconcile uncertain attempts before checking the remaining balance (a previous send may have spent it).
  for (const participant of pot.participants) {
    if (participant.payoutStatus === "sending") {
      pot = yield* confirmPayout(pot, participant);
    }
  }
  return pot;
});

const requirePayoutFunds = Effect.fn("requirePayoutFunds")(function* requirePayoutFunds(pot: Pot) {
  const bark = yield* Bark;
  yield* bark.sync();
  const remaining = pot.participants.reduce(
    (sum, participant): number => sum + (participant.payoutStatus === "paid" ? 0 : participant.receiveSat),
    0,
  );
  if ((yield* bark.balance()) < remaining) {
    yield* new PotError({ message: "Pot has insufficient spendable funds for remaining payouts" });
  }
});

const payRemainingParticipants = Effect.fn("payRemainingParticipants")(function* payRemainingParticipants(
  initial: Pot,
) {
  let pot = initial;
  for (const participant of pot.participants) {
    if (participant.receiveSat > 0 && participant.payoutStatus !== "paid") {
      pot = yield* payParticipant(pot, participant);
    }
  }
  const store = yield* PotStore;
  return yield* store.save({ ...pot, status: "settled" });
});

export const settlePot = Effect.fn("settlePot")(function* settlePot(id: string) {
  const confirmed = yield* confirmPot(id);
  if (confirmed.status === "settled") {
    return confirmed;
  }
  if (confirmed.participants.some((participant): boolean => participant.receivedSat < participant.payInSat)) {
    return yield* new PotError({ message: "Every participant must complete their own deposit before payouts" });
  }
  const reconciled = yield* reconcilePayouts(confirmed);
  yield* requirePayoutFunds(reconciled);
  return yield* payRemainingParticipants(reconciled);
});

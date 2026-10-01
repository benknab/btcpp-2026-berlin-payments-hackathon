import { randomUUID } from "node:crypto";

import { requireStandalonePot, requireUnreservedWallet } from "@/db/group-payment-access";
import { PotError } from "@/lib/pot";
import type { Pot } from "@/lib/pot";
import type { SettlementResult, SettlementSetupInput } from "@/lib/settlement";
import { Bark } from "@/server/bark/service";
import { Effect } from "effect";

import { confirmPot, createPot, settlePot } from "./service";
import { PotStore } from "./store";

export type Action =
  | Readonly<{ kind: "open" }>
  | Readonly<{ kind: "create"; setup: SettlementSetupInput }>
  | Readonly<{ kind: "refresh" | "pay"; id: string }>;

const executeAction = Effect.fn("executeSettlementAction")(function* executeAction(action: Action) {
  const store = yield* PotStore;
  if (action.kind === "open") {
    const bark = yield* Bark;
    const fingerprint = yield* bark.fingerprint();
    yield* requireUnreservedWallet(fingerprint);
    const pot = yield* store.findByWallet(fingerprint);
    if (pot !== null) {
      yield* requireStandalonePot(pot.id);
    }
    return pot;
  }
  if (action.kind === "create") {
    const bark = yield* Bark;
    yield* requireUnreservedWallet(yield* bark.fingerprint());
    const existing = yield* store.findByWallet(yield* bark.fingerprint());
    if (existing !== null) {
      return yield* new PotError({ message: "This wallet already has a pot. Reload the page to resume it" });
    }
    return yield* createPot({ ...action.setup, id: randomUUID() });
  }
  yield* requireStandalonePot(action.id);
  return yield* action.kind === "refresh" ? confirmPot(action.id) : settlePot(action.id);
});

export const actionResult = Effect.fn("settlementActionResult")(function* actionResult(action: Action) {
  const result = yield* Effect.result(executeAction(action));
  if (result._tag === "Success") {
    return { ok: true, pot: result.success } satisfies SettlementResult;
  }
  const store = yield* PotStore;
  let pot: Pot | null = null;
  if (action.kind === "refresh" || action.kind === "pay") {
    pot = yield* requireStandalonePot(action.id).pipe(
      Effect.flatMap(() => store.get(action.id)),
      Effect.catch(() => Effect.succeed(null)),
    );
  }
  return {
    ok: false,
    pot,
    message:
      result.failure._tag === "PotError" || result.failure._tag === "GroupError"
        ? result.failure.message
        : "Bark could not complete the request. Check the pot daemon and refresh; do not resend uncertain payouts",
  } satisfies SettlementResult;
});

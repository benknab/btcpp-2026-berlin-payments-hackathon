import { DatabaseLive } from "@/db/database";
import { loadSettlement, saveSettlement } from "@/db/settlements";
import { PotError } from "@/lib/pot";
import type { SettlementDocument, SettlementResult, SettlementSetupInput } from "@/lib/settlement";
import { settlementPaymentId, settlementSetup } from "@/lib/settlement";
import { Bark } from "@/server/bark/service";
import { Effect, Layer } from "effect";

import { confirmPot, createPot, settlePot } from "./service";
import { PotStoreLive } from "./store";
import { PotWallet, PotWalletLive } from "./wallet";

type Action =
  | Readonly<{ kind: "save"; id: number; setup: SettlementSetupInput }>
  | Readonly<{ kind: "prepare" | "refresh" | "pay"; id: number }>;

const executePayment = Effect.fn("executeSettlementPayment")(function* executePayment(
  kind: "prepare" | "refresh" | "pay",
  pot: SettlementDocument,
) {
  const id = settlementPaymentId(pot.id);
  if (kind === "prepare") {
    return yield* createPot({ ...settlementSetup(pot), id });
  }
  return yield* kind === "refresh" ? confirmPot(id) : settlePot(id);
});

export const runSettlementAction = Effect.fn("runSettlementAction")(function* runSettlementAction(action: Action) {
  if (action.kind === "save") {
    return yield* saveSettlement(action.id, action.setup);
  }
  const pot = yield* loadSettlement(action.id);
  if (!pot.locked) {
    return yield* new PotError({ message: "Save the participants and debts before preparing deposits" });
  }
  if (action.kind === "prepare" && pot.execution !== null) {
    return pot;
  }
  if (action.kind !== "prepare" && pot.execution === null) {
    return yield* new PotError({ message: "Prepare this pot's deposits first" });
  }
  const wallets = yield* PotWallet;
  const bark = yield* wallets.open(pot.id, pot.execution === null);
  yield* executePayment(action.kind, pot).pipe(Effect.provideService(Bark, bark));
  return yield* loadSettlement(pot.id);
});

export const settlementActionResult = Effect.fn("settlementActionResult")(function* settlementActionResult(
  action: Action,
) {
  const result = yield* Effect.result(runSettlementAction(action).pipe(Effect.scoped));
  if (result._tag === "Success") {
    return { ok: true, pot: result.success } satisfies SettlementResult;
  }
  const pot = yield* loadSettlement(action.id).pipe(Effect.catch(() => Effect.succeed(null)));
  const failure: unknown = result.failure;
  return {
    ok: false,
    pot,
    message:
      failure instanceof PotError
        ? failure.message
        : "Payment request interrupted. Refresh this pot before proceeding; do not resend uncertain payouts",
  } satisfies SettlementResult;
});

const services = Layer.mergeAll(DatabaseLive, PotWalletLive, PotStoreLive.pipe(Layer.provide(DatabaseLive)));

export function settlementRequest(action: Action): Promise<SettlementResult> {
  return Effect.runPromise(settlementActionResult(action).pipe(Effect.provide(services)));
}

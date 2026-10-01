import { randomUUID } from "node:crypto";

import { DatabaseLive } from "@/db/database";
import { PotError } from "@/lib/pot";
import type { Pot } from "@/lib/pot";
import type { SettlementResult, SettlementSetupInput } from "@/lib/settlement";
import { barkLayer } from "@/server/bark/sdk";
import { Bark } from "@/server/bark/service";
import { Effect, Layer } from "effect";

import { confirmPot, createPot, settlePot } from "./service";
import { PotStore, PotStoreLive } from "./store";
import { authorizeSettlement, UiPotConfigLive } from "./ui-config";

type Action =
  | Readonly<{ kind: "open" }>
  | Readonly<{ kind: "create"; setup: SettlementSetupInput }>
  | Readonly<{ kind: "refresh" | "pay"; id: string }>;

const executeAction = Effect.fn("executeSettlementAction")(function* executeAction(action: Action) {
  const store = yield* PotStore;
  if (action.kind === "open") {
    const bark = yield* Bark;
    return yield* store.findByWallet(yield* bark.fingerprint());
  }
  if (action.kind === "create") {
    const bark = yield* Bark;
    const existing = yield* store.findByWallet(yield* bark.fingerprint());
    if (existing !== null) {
      return yield* new PotError({ message: "This wallet already has a pot. Reconnect to resume it" });
    }
    return yield* createPot({ ...action.setup, id: randomUUID() });
  }
  return yield* action.kind === "refresh" ? confirmPot(action.id) : settlePot(action.id);
});

const actionResult = Effect.fn("settlementActionResult")(function* actionResult(action: Action) {
  const result = yield* Effect.result(executeAction(action));
  if (result._tag === "Success") {
    return { ok: true, pot: result.success } satisfies SettlementResult;
  }
  const store = yield* PotStore;
  let pot: Pot | null = null;
  if (action.kind === "refresh" || action.kind === "pay") {
    pot = yield* store.get(action.id).pipe(Effect.catch(() => Effect.succeed(null)));
  }
  return {
    ok: false,
    pot,
    message:
      result.failure._tag === "PotError"
        ? result.failure.message
        : "Bark could not complete the request. Check the pot daemon and refresh; do not resend uncertain payouts",
  } satisfies SettlementResult;
});

export const runSettlementAction = Effect.fn("runSettlementAction")(function* runSettlementAction(
  accessCode: string,
  action: Action,
) {
  const config = yield* authorizeSettlement(accessCode);
  const services = Layer.merge(barkLayer(config), PotStoreLive.pipe(Layer.provide(DatabaseLive)));
  return yield* actionResult(action).pipe(Effect.provide(services));
});

export function settlementRequest(accessCode: string, action: Action): Promise<SettlementResult> {
  return Effect.runPromise(
    runSettlementAction(accessCode, action).pipe(
      Effect.provide(UiPotConfigLive),
      Effect.catch((error: Readonly<{ _tag: string; message: string }>) =>
        Effect.succeed({
          ok: false,
          pot: null,
          message:
            error._tag === "PotError"
              ? error.message
              : "Configure BARK_POT_TOKEN and POT_UI_ACCESS_CODE on the server first",
        } satisfies SettlementResult),
      ),
    ),
  );
}

import { DatabaseLive } from "@/db/database";
import type { SettlementResult } from "@/lib/settlement";
import { Effect, Layer } from "effect";

import { PotStoreLive } from "./store";
import { actionResult } from "./ui-actions";
import type { Action } from "./ui-actions";
import { UiPotConfigLive } from "./ui-config";
import { configuredWallet } from "./wallet-layer";

export const runSettlementAction = Effect.fn("runSettlementAction")(function* runSettlementAction(action: Action) {
  const services = Layer.merge(yield* configuredWallet, PotStoreLive.pipe(Layer.provide(DatabaseLive)));
  return yield* actionResult(action).pipe(Effect.provide(services), Effect.provide(DatabaseLive));
});

export function settlementRequest(action: Action): Promise<SettlementResult> {
  return Effect.runPromise(
    runSettlementAction(action).pipe(
      Effect.provide(UiPotConfigLive),
      Effect.catch((error: Readonly<{ _tag: string; message: string }>) =>
        Effect.succeed({
          ok: false,
          pot: null,
          message: error._tag === "PotError" ? error.message : "Configure BARK_POT_TOKEN on the server first",
        } satisfies SettlementResult),
      ),
    ),
  );
}

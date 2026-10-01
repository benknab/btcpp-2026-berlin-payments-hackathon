import { DatabaseLive } from "@/db/database";
import { groupSettlementPage, lockGroupSettlement } from "@/db/group-settlements";
import { requireOrganizer } from "@/db/participant-payments";
import { Effect, Layer } from "effect";

import { executeGroupPayment } from "./group-service";
import type { GroupPaymentAction } from "./group-service";
import { PotStoreLive } from "./store";
import { UiPotConfigLive } from "./ui-config";
import { configuredWallet } from "./wallet-layer";

export type { GroupPaymentAction } from "./group-service";

const withWallet = Effect.fn("withGroupWallet")(function* withWallet(action: GroupPaymentAction) {
  return yield* executeGroupPayment(action).pipe(Effect.provide(yield* configuredWallet));
});

export const groupPaymentRequest = Effect.fn("groupPaymentRequest")(function* groupPaymentRequest(
  action: GroupPaymentAction,
) {
  yield* requireOrganizer(action.inviteKey, action.organizerToken);
  const page = yield* groupSettlementPage(action.inviteKey);
  // All-square groups need neither a wallet nor addresses, and move no money.
  if (action.kind === "close" && page.preview.totalSat === 0) {
    yield* lockGroupSettlement({
      inviteKey: action.inviteKey,
      fingerprint: action.fingerprint ?? "",
      organizerToken: action.organizerToken,
      walletFingerprint: null,
    });
    return yield* groupSettlementPage(action.inviteKey);
  }
  return yield* withWallet(action).pipe(Effect.provide(UiPotConfigLive));
});

export const GroupPaymentLive = Layer.merge(DatabaseLive, PotStoreLive.pipe(Layer.provide(DatabaseLive)));

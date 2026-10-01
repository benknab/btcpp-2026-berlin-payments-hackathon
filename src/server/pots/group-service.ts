import { markGroupSettled, requireUnreservedWallet, settlementIntent } from "@/db/group-payment-access";
import { groupSettlementPage, lockGroupSettlement } from "@/db/group-settlements";
import { GroupError } from "@/db/groups";
import { requireOrganizer } from "@/db/participant-payments";
import { PotInputSchema } from "@/lib/pot";
import { Bark } from "@/server/bark/service";
import { Effect, Schema } from "effect";

import { confirmPot, createPot, settlePot } from "./service";
import { PotStore } from "./store";

export type GroupPaymentAction = Readonly<{
  kind: "close" | "refresh" | "pay";
  inviteKey: string;
  organizerToken?: string | undefined;
  fingerprint?: string;
}>;

export const executeGroupPayment = Effect.fn("executeGroupPayment")(function* executeGroupPayment(
  action: GroupPaymentAction,
) {
  const view = yield* requireOrganizer(action.inviteKey, action.organizerToken);
  const bark = yield* Bark;
  const store = yield* PotStore;
  const fingerprint = yield* bark.fingerprint();
  yield* requireUnreservedWallet(fingerprint, view.group.id);
  const existing = yield* store.findByWallet(fingerprint);
  if (existing !== null && existing.id !== view.group.id) {
    return yield* new GroupError({
      message: "This wallet already has another pot. Configure a new isolated Bark pot wallet.",
    });
  }
  if (action.kind === "close") {
    const snapshot = yield* lockGroupSettlement({
      inviteKey: action.inviteKey,
      organizerToken: action.organizerToken,
      fingerprint: action.fingerprint ?? "",
      walletFingerprint: fingerprint,
    });
    if (existing === null) {
      yield* createPot(yield* Schema.decodeUnknownEffect(PotInputSchema)(snapshot));
    }
  } else {
    const intent = yield* settlementIntent(view.group.id);
    if (intent === null || intent.walletFingerprint !== fingerprint || existing === null) {
      return yield* new GroupError({
        message: "Settlement is not initialized. The organizer must resume closing the group first.",
      });
    }
    const pot = yield* action.kind === "pay" ? settlePot(view.group.id) : confirmPot(view.group.id);
    if (pot.status === "settled") {
      yield* markGroupSettled(view.group.id);
    }
  }
  return yield* groupSettlementPage(action.inviteKey);
});

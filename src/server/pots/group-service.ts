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

const walletContext = Effect.fn("managedWalletContext")(function* walletContext(action: GroupPaymentAction) {
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
  return { groupId: view.group.id, fingerprint, hasPot: existing !== null };
});

type WalletContext = Effect.Success<ReturnType<typeof walletContext>>;

const closeManagedGroup = Effect.fn("closeManagedGroup")(function* closeManagedGroup(
  action: GroupPaymentAction,
  context: Readonly<WalletContext>,
) {
  const snapshot = yield* lockGroupSettlement({
    inviteKey: action.inviteKey,
    organizerToken: action.organizerToken,
    fingerprint: action.fingerprint ?? "",
    walletFingerprint: context.fingerprint,
  });
  if (!context.hasPot) {
    yield* createPot(yield* Schema.decodeUnknownEffect(PotInputSchema)(snapshot));
  }
});

const progressManagedGroup = Effect.fn("progressManagedGroup")(function* progressManagedGroup(
  action: GroupPaymentAction,
  context: Readonly<WalletContext>,
) {
  const intent = yield* settlementIntent(context.groupId);
  if (intent === null || intent.walletFingerprint !== context.fingerprint || !context.hasPot) {
    yield* new GroupError({
      message: "Settlement is not initialized. The organizer must resume closing the group first.",
    });
    return;
  }
  const pot = yield* action.kind === "pay" ? settlePot(context.groupId) : confirmPot(context.groupId);
  if (pot.status === "settled") {
    yield* markGroupSettled(context.groupId);
  }
});

export const executeGroupPayment = Effect.fn("executeGroupPayment")(function* executeGroupPayment(
  action: GroupPaymentAction,
) {
  const context = yield* walletContext(action);
  yield* action.kind === "close" ? closeManagedGroup(action, context) : progressManagedGroup(action, context);
  return yield* groupSettlementPage(action.inviteKey);
});

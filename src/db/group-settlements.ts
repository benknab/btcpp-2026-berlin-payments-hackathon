import { GroupSettlementSnapshot } from "@/domain/group-settlement";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { readGroupPot, requireUnreservedWallet, settlementIntent } from "./group-payment-access";
import { previewGroupSettlement } from "./group-settlement-preview";
import { getGroup, GroupError } from "./groups";
import { requireOrganizer } from "./participant-payments";
import { groupSettlements, groups } from "./schema";

export const groupSettlementPage = Effect.fn("groupSettlementPage")(function* groupSettlementPage(inviteKey: string) {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* readPage() {
      const view = yield* getGroup(inviteKey);
      const preview = yield* previewGroupSettlement(inviteKey);
      const intent = yield* settlementIntent(view.group.id);
      return { preview, status: view.group.status, pot: intent === null ? null : yield* readGroupPot(view.group.id) };
    }),
  );
});
export type GroupSettlementPage = Effect.Success<ReturnType<typeof groupSettlementPage>>;

export const lockGroupSettlement = Effect.fn("lockGroupSettlement")(function* lockGroupSettlement(
  input: Readonly<{
    inviteKey: string;
    fingerprint: string;
    walletFingerprint: string | null;
    organizerToken?: string | undefined;
  }>,
) {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* freeze() {
      const view = yield* requireOrganizer(input.inviteKey, input.organizerToken);
      const existing = yield* settlementIntent(view.group.id);
      if (existing !== null) {
        if (existing.walletFingerprint !== input.walletFingerprint) {
          return yield* new GroupError({ message: "Use the wallet reserved for this group's settlement." });
        }
        return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(GroupSettlementSnapshot))(existing.snapshot);
      }
      if (view.group.status !== "open") {
        return yield* new GroupError({
          message: "This group is locked without a settlement checkpoint. Contact the organizer.",
        });
      }
      const preview = yield* previewGroupSettlement(input.inviteKey);
      if (input.fingerprint !== preview.fingerprint) {
        return yield* new GroupError({
          message: "Expenses or addresses changed. Refresh and review the new settlement.",
        });
      }
      if (preview.missingNames.length > 0) {
        return yield* new GroupError({
          message: `Waiting for personal Bark addresses: ${preview.missingNames.join(", ")}.`,
        });
      }
      if (preview.totalSat > 0 && input.walletFingerprint === null) {
        return yield* new GroupError({ message: "A dedicated Bark signet wallet is required." });
      }
      if (input.walletFingerprint !== null) {
        yield* requireUnreservedWallet(input.walletFingerprint, view.group.id);
      }
      yield* database.insert(groupSettlements).values({
        groupId: view.group.id,
        snapshot: JSON.stringify(preview.snapshot),
        walletFingerprint: input.walletFingerprint,
      });
      yield* database
        .update(groups)
        .set({ status: preview.totalSat === 0 ? "settled" : "settling" })
        .where(and(eq(groups.id, view.group.id), eq(groups.status, "open")));
      return preview.snapshot;
    }),
  );
});

import { GroupSettlementSnapshot } from "@/domain/group-settlement";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { readGroupPot, requireUnreservedWallet, settlementIntent } from "./group-payment-access";
import { previewGroupSettlement } from "./group-settlement-preview";
import { getGroup, GroupError } from "./groups";
import { requireOrganizer } from "./participant-payments";
import { eventSettlements, groupSettlements, groups } from "./schema";

export const groupSettlementPage = Effect.fn("groupSettlementPage")(function* groupSettlementPage(inviteKey: string) {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* readPage() {
      const view = yield* getGroup(inviteKey);
      const preview = yield* previewGroupSettlement(inviteKey);
      const intent = yield* settlementIntent(view.group.id);
      const [browser] = yield* database
        .select({ id: eventSettlements.groupId })
        .from(eventSettlements)
        .where(eq(eventSettlements.groupId, view.group.id));
      return {
        preview,
        status: view.group.status,
        browserSettlement: browser !== undefined,
        pot: intent === null ? null : yield* readGroupPot(view.group.id),
      };
    }),
  );
});
export type GroupSettlementPage = Effect.Success<ReturnType<typeof groupSettlementPage>>;

interface LockGroupInput {
  readonly inviteKey: string;
  readonly fingerprint: string;
  readonly walletFingerprint: string | null;
  readonly organizerToken?: string | undefined;
}

const readCheckpoint = Effect.fn("readManagedCheckpoint")(function* readCheckpoint(
  existing: Readonly<typeof groupSettlements.$inferSelect>,
  walletFingerprint: string | null,
) {
  if (existing.walletFingerprint !== walletFingerprint) {
    return yield* new GroupError({ message: "Use the wallet reserved for this group's settlement." });
  }
  return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(GroupSettlementSnapshot))(existing.snapshot);
});

const reviewedPreview = Effect.fn("reviewedManagedPreview")(function* reviewedPreview(input: LockGroupInput) {
  const preview = yield* previewGroupSettlement(input.inviteKey);
  if (input.fingerprint !== preview.fingerprint) {
    return yield* new GroupError({ message: "Expenses or addresses changed. Refresh and review the new settlement." });
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
    yield* requireUnreservedWallet(input.walletFingerprint, preview.snapshot.id);
  }
  return preview;
});

const persistCheckpoint = Effect.fn("persistManagedCheckpoint")(function* persistCheckpoint(input: LockGroupInput) {
  const database = yield* Database;
  const preview = yield* reviewedPreview(input);
  const updated = yield* database
    .update(groups)
    .set({ status: preview.totalSat === 0 ? "settled" : "settling" })
    .where(and(eq(groups.id, preview.snapshot.id), eq(groups.status, "open")))
    .returning({ id: groups.id });
  if (updated.length !== 1) {
    return yield* new GroupError({ message: "Settlement changed. Reload the event." });
  }
  yield* database.insert(groupSettlements).values({
    groupId: preview.snapshot.id,
    snapshot: JSON.stringify(preview.snapshot),
    walletFingerprint: input.walletFingerprint,
  });
  return preview.snapshot;
});

export const lockGroupSettlement = Effect.fn("lockGroupSettlement")(function* lockGroupSettlement(
  input: LockGroupInput,
): Effect.fn.Return<
  typeof GroupSettlementSnapshot.Type,
  Effect.Error<ReturnType<typeof previewGroupSettlement>> | Schema.SchemaError,
  Database
> {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* freeze() {
      const view = yield* requireOrganizer(input.inviteKey, input.organizerToken);
      const existing = yield* settlementIntent(view.group.id);
      if (existing !== null) {
        return yield* readCheckpoint(existing, input.walletFingerprint);
      }
      if (view.group.status !== "open") {
        return yield* new GroupError({
          message: "This group is locked without a settlement checkpoint. Contact the organizer.",
        });
      }
      return yield* persistCheckpoint(input);
    }),
  );
});

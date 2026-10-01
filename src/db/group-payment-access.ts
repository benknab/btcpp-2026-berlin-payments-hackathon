import { PotSchema } from "@/lib/pot";
import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { GroupError } from "./groups";
import { groupSettlements, groups, pots } from "./schema";

export const settlementIntent = Effect.fn("settlementIntent")(function* settlementIntent(groupId: string) {
  const database = yield* Database;
  const [intent] = yield* database.select().from(groupSettlements).where(eq(groupSettlements.groupId, groupId));
  return intent ?? null;
});

export const readGroupPot = Effect.fn("readGroupPot")(function* readGroupPot(groupId: string) {
  const database = yield* Database;
  const [row] = yield* database.select().from(pots).where(eq(pots.id, groupId));
  return row === undefined ? null : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(PotSchema))(row.snapshot);
});

export const requireUnreservedWallet = Effect.fn("requireUnreservedWallet")(function* requireUnreservedWallet(
  fingerprint: string,
  groupId?: string,
) {
  const database = yield* Database;
  const [reserved] = yield* database
    .select({ groupId: groupSettlements.groupId })
    .from(groupSettlements)
    .where(eq(groupSettlements.walletFingerprint, fingerprint));
  if (reserved !== undefined && reserved.groupId !== groupId) {
    yield* new GroupError({
      message: "This wallet is reserved for a group. Configure a new isolated pot wallet for another settlement.",
    });
  }
});

export const requireStandalonePot = Effect.fn("requireStandalonePot")(function* requireStandalonePot(id: string) {
  if ((yield* settlementIntent(id)) !== null) {
    yield* new GroupError({
      message: "This pot belongs to a group. Use the group's organizer-authorized settlement page.",
    });
  }
});

export const markGroupSettled = Effect.fn("markGroupSettled")(function* markGroupSettled(groupId: string) {
  const database = yield* Database;
  yield* database.update(groups).set({ status: "settled" }).where(eq(groups.id, groupId));
});

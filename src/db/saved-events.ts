import type { SavedEventSummary } from "@/domain/saved-events";
import { hashToken } from "@/server/group-tokens";
import { inArray } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { Effect } from "effect";

import { Database } from "./database";
import { groups } from "./group-schema";

export const getSavedEvents = Effect.fn("getSavedEvents")(function* getSavedEvents(
  inviteKeys: readonly string[],
): Effect.fn.Return<readonly SavedEventSummary[], EffectDrizzleQueryError, Database> {
  if (inviteKeys.length === 0) {
    return [];
  }
  const database = yield* Database;
  const saved = yield* database
    .select({ name: groups.name, inviteTokenHash: groups.inviteTokenHash })
    .from(groups)
    .where(
      inArray(
        groups.inviteTokenHash,
        inviteKeys.map((inviteKey) => hashToken(inviteKey)),
      ),
    );
  const names = new Map(saved.map((group) => [group.inviteTokenHash, group.name]));
  return [...new Set(inviteKeys)].flatMap((inviteKey) => {
    const name = names.get(hashToken(inviteKey));
    return name === undefined ? [] : [{ inviteKey, name }];
  });
});

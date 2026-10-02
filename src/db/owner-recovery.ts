import { hashToken, newToken } from "@/server/group-tokens";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "./database";
import { groups } from "./group-schema";
import { getGroup, GroupError } from "./groups";

/** Prototype-only: possession of the event link permits self-declared owner recovery. */
export const recoverOwner = Effect.fn("recoverOwner")(function* recoverOwner(inviteKey: string) {
  const view = yield* getGroup(inviteKey);
  const owner = view.participants.find((participant) => participant.position === 0);
  if (view.group.arkAddress === null || owner === undefined) {
    return yield* new GroupError({ message: "This event has no browser wallet to restore." });
  }
  const database = yield* Database;
  const organizerToken = newToken();
  yield* database
    .update(groups)
    .set({ organizerTokenHash: hashToken(organizerToken) })
    .where(eq(groups.id, view.group.id));
  return { groupId: view.group.id, organizerId: owner.id, organizerToken };
});

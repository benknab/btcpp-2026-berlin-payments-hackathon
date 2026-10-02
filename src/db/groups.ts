import { CreateGroupRequest } from "@/domain/group-input";
import { hashToken, newId, newToken, verifiesToken } from "@/server/group-tokens";
import { asc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { Data, Effect, Schema } from "effect";
import type { SqlError } from "effect/sql";

import { Database } from "./database";
import { groups, participants } from "./group-schema";

export type GroupData = Pick<typeof groups.$inferSelect, "id" | "name" | "arkAddress" | "status" | "createdAt">;
export type ParticipantData = Pick<typeof participants.$inferSelect, "id" | "name" | "position" | "lnurl">;
export interface GroupView {
  readonly group: GroupData;
  readonly participants: readonly ParticipantData[];
  readonly isOrganizer: boolean;
}
export type GroupDatabaseError = EffectDrizzleQueryError | SqlError.SqlError;
export class GroupError extends Data.TaggedError("GroupError")<{ readonly message: string }> {}

export const createGroup = Effect.fn("createGroup")(function* createGroup(
  input: typeof CreateGroupRequest.Type,
): Effect.fn.Return<
  {
    readonly inviteKey: string;
    readonly organizerToken: string;
    readonly organizerId: string;
    readonly groupId: string;
  },
  GroupDatabaseError | Schema.SchemaError,
  Database
> {
  const valid = yield* Schema.decodeUnknownEffect(CreateGroupRequest)(input);
  const database = yield* Database;
  const groupId = newId();
  const organizerId = newId();
  const inviteKey = newToken();
  const organizerToken = newToken();
  yield* database.transaction(() =>
    Effect.gen(function* insertGroup() {
      yield* database.insert(groups).values({
        id: groupId,
        name: valid.name,
        arkAddress: valid.arkAddress,
        inviteTokenHash: hashToken(inviteKey),
        organizerTokenHash: hashToken(organizerToken),
      });
      yield* database.insert(participants).values(
        [valid.organizerName, ...valid.participantNames].map((name, position) => ({
          id: position === 0 ? organizerId : newId(),
          groupId,
          name,
          nameKey: name.toLocaleLowerCase("en-US"),
          lnurl: position === 0 ? valid.organizerLnurl : (valid.participantLnurls?.[position - 1] ?? null),
          position,
        })),
      );
    }),
  );
  return { inviteKey, organizerToken, organizerId, groupId };
});

export const getGroup = Effect.fn("getGroup")(function* getGroup(
  inviteKey: string,
  organizerToken?: string,
): Effect.fn.Return<GroupView, EffectDrizzleQueryError | GroupError, Database> {
  const database = yield* Database;
  const [group] = yield* database
    .select()
    .from(groups)
    .where(eq(groups.inviteTokenHash, hashToken(inviteKey)));
  if (group === undefined) {
    return yield* new GroupError({ message: "This group invitation is not available." });
  }
  const members = yield* database
    .select({
      id: participants.id,
      name: participants.name,
      position: participants.position,
      lnurl: participants.lnurl,
    })
    .from(participants)
    .where(eq(participants.groupId, group.id))
    .orderBy(asc(participants.position));
  return {
    group: {
      id: group.id,
      name: group.name,
      arkAddress: group.arkAddress,
      status: group.status,
      createdAt: group.createdAt,
    },
    participants: members,
    isOrganizer: verifiesToken(organizerToken, group.organizerTokenHash),
  };
});

export const requireParticipant = Effect.fn("requireParticipant")(function* requireParticipant(
  inviteKey: string,
  participantId: string,
): Effect.fn.Return<GroupView, EffectDrizzleQueryError | GroupError, Database> {
  const view = yield* getGroup(inviteKey);
  if (!view.participants.some((participant) => participant.id === participantId)) {
    return yield* new GroupError({ message: "Select a participant from this group." });
  }
  return view;
});

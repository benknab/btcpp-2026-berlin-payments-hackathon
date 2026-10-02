import { SavePersonalAddress } from "@/domain/group-settlement";
import { hashToken, newToken } from "@/server/group-tokens";
import { and, eq, ne } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { participantPayments } from "./group-payment-schema";
import { groups, participants } from "./group-schema";
import { getGroup, GroupError, requireParticipant } from "./groups";

export const requireOrganizer = Effect.fn("requireOrganizer")(function* requireOrganizer(
  inviteKey: string,
  token?: string,
) {
  const view = yield* getGroup(inviteKey, token);
  if (!view.isOrganizer) {
    return yield* new GroupError({ message: "Only this group's organizer can do that." });
  }
  return view;
});

export const issuePersonalLink = Effect.fn("issuePersonalLink")(function* issuePersonalLink(
  inviteKey: string,
  participantId: string,
  organizerToken?: string,
) {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* issueLink() {
      const view = yield* requireOrganizer(inviteKey, organizerToken);
      yield* requireParticipant(inviteKey, participantId);
      if (view.group.status !== "open") {
        return yield* new GroupError({ message: "Personal links and payout addresses are locked during settlement." });
      }
      const accessKey = newToken();
      yield* database
        .insert(participantPayments)
        .values({ participantId, accessTokenHash: hashToken(accessKey) })
        .onConflictDoUpdate({
          target: participantPayments.participantId,
          set: { accessTokenHash: hashToken(accessKey) },
        });
      return { accessKey };
    }),
  );
});

export const personalPayment = Effect.fn("personalPayment")(function* personalPayment(accessKey: string) {
  const database = yield* Database;
  const [row] = yield* database
    .select({
      participantId: participants.id,
      name: participants.name,
      groupId: groups.id,
      groupName: groups.name,
      status: groups.status,
      arkAddress: participantPayments.arkAddress,
    })
    .from(participantPayments)
    .innerJoin(participants, eq(participants.id, participantPayments.participantId))
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(eq(participantPayments.accessTokenHash, hashToken(accessKey)));
  if (row === undefined) {
    return yield* new GroupError({ message: "This private participant link is unavailable or has been replaced." });
  }
  return row;
});

export const savePersonalAddress = Effect.fn("savePersonalAddress")(function* savePersonalAddress(
  input: typeof SavePersonalAddress.Type,
) {
  const valid = yield* Schema.decodeUnknownEffect(SavePersonalAddress)(input);
  const database = yield* Database;
  yield* database.transaction(() =>
    Effect.gen(function* saveAddress() {
      const profile = yield* personalPayment(valid.accessKey);
      if (profile.status !== "open") {
        yield* new GroupError({ message: "Your payout address is locked because settlement has started." });
      }
      const [duplicate] = yield* database
        .select({ id: participants.id })
        .from(participantPayments)
        .innerJoin(participants, eq(participants.id, participantPayments.participantId))
        .where(
          and(
            eq(participants.groupId, profile.groupId),
            ne(participants.id, profile.participantId),
            eq(participantPayments.arkAddress, valid.arkAddress),
          ),
        );
      if (duplicate !== undefined) {
        yield* new GroupError({ message: "Each person needs a different personal Bark address." });
      }
      yield* database
        .update(participantPayments)
        .set({ arkAddress: valid.arkAddress })
        .where(eq(participantPayments.participantId, profile.participantId));
    }),
  );
});

import { SettlementMembers } from "@/domain/event-settlement";
import type { ReceivingAddressRequest } from "@/domain/event-settlement";
import { hasUniquePayoutDestinations } from "@/domain/payout-destination";
import { and, eq, ne } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { eventPayouts } from "./event-payment-schema";
import { requireOrganizer } from "./event-settlement";
import type { SettlementError } from "./event-settlement";
import { eventSettlements } from "./event-settlement-schema";
import { participants } from "./group-schema";
import { GroupError } from "./groups";

const updateSnapshot = Effect.fn("updateSettlementDestination")(function* updateSnapshot(
  groupId: string,
  input: typeof ReceivingAddressRequest.Type,
) {
  const database = yield* Database;
  const [snapshot] = yield* database.select().from(eventSettlements).where(eq(eventSettlements.groupId, groupId));
  if (snapshot === undefined) {
    yield* new GroupError({ message: "This event has no browser settlement." });
    return;
  }
  const members = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(SettlementMembers))(snapshot.members);
  const scope = and(eq(eventPayouts.groupId, groupId), eq(eventPayouts.participantId, input.participantId));
  const active = yield* database
    .select()
    .from(eventPayouts)
    .where(and(scope, ne(eventPayouts.status, "expired")));
  if (active.some((payout) => payout.status === "sending" || payout.status === "paid")) {
    yield* new GroupError({ message: "This payout has already started. Its receiving address cannot change." });
    return;
  }
  yield* database
    .update(eventPayouts)
    .set({ status: "expired" })
    .where(and(scope, eq(eventPayouts.status, "prepared")));
  yield* database
    .update(eventSettlements)
    .set({
      members: JSON.stringify(
        members.map((member) =>
          member.participantId === input.participantId
            ? {
                participantId: member.participantId,
                name: member.name,
                payInSats: member.payInSats,
                receiveSats: member.receiveSats,
                lnurl: input.lnurl,
              }
            : member,
        ),
      ),
    })
    .where(eq(eventSettlements.groupId, groupId));
});

export const saveReceivingAddress = Effect.fn("saveReceivingAddress")(function* saveReceivingAddress(
  input: typeof ReceivingAddressRequest.Type,
  token: string | undefined,
): Effect.fn.Return<void, SettlementError, Database> {
  const database = yield* Database;
  yield* database.transaction(() =>
    Effect.gen(function* updateAddress() {
      const view = yield* requireOrganizer(input.inviteKey, token);
      const destinations = view.participants.map((member) =>
        member.id === input.participantId ? input.lnurl : member.lnurl,
      );
      if (
        (view.group.status !== "open" && view.group.status !== "settling") ||
        !view.participants.some((member) => member.id === input.participantId) ||
        !hasUniquePayoutDestinations(destinations)
      ) {
        yield* new GroupError({ message: "Use a distinct receiving address while settlement is active." });
        return;
      }
      if (view.group.status === "settling") {
        yield* updateSnapshot(view.group.id, input);
      }
      yield* database.update(participants).set({ lnurl: input.lnurl }).where(eq(participants.id, input.participantId));
      yield* Effect.logInfo("settlement.destination.updated", {
        groupId: view.group.id,
        participantId: input.participantId,
      });
    }),
  );
});

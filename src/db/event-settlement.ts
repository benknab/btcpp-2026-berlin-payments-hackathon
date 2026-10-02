import type { AccountingError } from "@/domain/accounting";
import { SettlementMembers } from "@/domain/event-settlement";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { getOverview } from "./balances";
import { Database } from "./database";
import { eventSettlements } from "./event-settlement-schema";
import { groups } from "./group-schema";
import { getGroup, GroupError } from "./groups";
import type { GroupDatabaseError, GroupView } from "./groups";

export type SettlementError = GroupDatabaseError | GroupError | Schema.SchemaError | AccountingError;

export const requireOrganizer = Effect.fn("requireEventOrganizer")(function* requireOrganizer(
  inviteKey: string,
  token?: string,
): Effect.fn.Return<GroupView, GroupDatabaseError | GroupError, Database> {
  const view = yield* getGroup(inviteKey, token);
  if (!view.isOrganizer) {
    return yield* new GroupError({ message: "Only the organizer can change settlement." });
  }
  return view;
});

export const loadEventSettlement = Effect.fn("loadEventSettlement")(function* loadEventSettlement(
  inviteKey: string,
): Effect.fn.Return<readonly EventSettlementMember[] | null, SettlementError, Database> {
  const view = yield* getGroup(inviteKey);
  const database = yield* Database;
  const [row] = yield* database.select().from(eventSettlements).where(eq(eventSettlements.groupId, view.group.id));
  return row === undefined
    ? null
    : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(SettlementMembers))(row.members);
});

const prepareMembers = Effect.fn("prepareEventSettlementMembers")(function* prepareMembers(inviteKey: string) {
  const view = yield* getGroup(inviteKey);
  const overview = yield* getOverview(inviteKey);
  const members = view.participants.map((member): EventSettlementMember => {
    const balance = overview.balances.find((entry) => entry.participantId === member.id)?.expenseBalanceSats ?? 0;
    return {
      participantId: member.id,
      name: member.name,
      payInSats: Math.max(0, -balance),
      receiveSats: Math.max(0, balance),
      lnurl: member.lnurl,
    };
  });
  if (members.some((member) => member.receiveSats > 0 && member.lnurl === null)) {
    return yield* new GroupError({ message: "Everyone receiving sats needs a receiving address." });
  }
  return members;
});

const beginSettlement = Effect.fn("beginEventSettlement")(function* beginSettlement(groupId: string) {
  const database = yield* Database;
  const updated = yield* database
    .update(groups)
    .set({ status: "settling" })
    .where(and(eq(groups.id, groupId), eq(groups.status, "open")))
    .returning({ id: groups.id });
  if (updated.length !== 1) {
    yield* new GroupError({ message: "Settlement changed. Reload the event." });
  }
});

const existingBrowserSettlement = Effect.fn("existingBrowserSettlement")(function* existingBrowserSettlement(
  inviteKey: string,
) {
  const existing = yield* loadEventSettlement(inviteKey);
  if (existing === null) {
    return yield* new GroupError({ message: "This event has no browser settlement checkpoint." });
  }
  return existing;
});

export const lockEventSettlement = Effect.fn("lockEventSettlement")(function* lockEventSettlement(
  inviteKey: string,
  token?: string,
): Effect.fn.Return<readonly EventSettlementMember[] | null, SettlementError, Database> {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* lockSnapshot() {
      const view = yield* requireOrganizer(inviteKey, token);
      if (view.group.arkAddress === null) {
        return yield* new GroupError({ message: "This event has no browser wallet." });
      }
      if (view.group.status !== "open") {
        return yield* existingBrowserSettlement(inviteKey);
      }
      yield* beginSettlement(view.group.id);
      const members = yield* prepareMembers(inviteKey);
      yield* database.insert(eventSettlements).values({ groupId: view.group.id, members: JSON.stringify(members) });
      return members;
    }),
  );
});

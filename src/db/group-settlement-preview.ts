import { calculateBalances } from "@/domain/accounting";
import { GroupSettlementSnapshot, netDebts } from "@/domain/group-settlement";
import { hashToken } from "@/server/group-tokens";
import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { listExpenses } from "./expenses";
import { settlementIntent } from "./group-payment-access";
import { getGroup } from "./groups";
import { participantPayments, participants } from "./schema";

export const previewGroupSettlement = Effect.fn("previewGroupSettlement")(function* previewGroupSettlement(
  inviteKey: string,
) {
  const database = yield* Database;
  const view = yield* getGroup(inviteKey);
  const entries = yield* listExpenses(inviteKey);
  const balances = yield* calculateBalances({
    participantIds: view.participants.map((person) => person.id),
    expenses: entries,
    contributions: [],
  });
  const addresses = yield* database
    .select({ id: participants.id, arkAddress: participantPayments.arkAddress })
    .from(participants)
    .leftJoin(participantPayments, eq(participants.id, participantPayments.participantId))
    .where(eq(participants.groupId, view.group.id));
  const intent = yield* settlementIntent(view.group.id);
  const snapshot =
    intent === null
      ? {
          id: view.group.id,
          users: view.participants.map((person) => ({
            id: person.id,
            name: person.name,
            arkAddress: addresses.find((row) => row.id === person.id)?.arkAddress ?? null,
          })),
          debts: yield* netDebts(balances),
        }
      : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(GroupSettlementSnapshot))(intent.snapshot);
  const totalSat = snapshot.debts.reduce((sum, debt) => sum + debt.amountSat, 0);
  const fingerprint = hashToken(
    JSON.stringify({ snapshot, versions: entries.map((entry) => [entry.id, entry.version]) }),
  );
  return {
    snapshot,
    balances,
    totalSat,
    fingerprint,
    missingNames:
      totalSat === 0 ? [] : snapshot.users.filter((person) => person.arkAddress === null).map((person) => person.name),
  };
});
export type GroupSettlementPreview = Effect.Success<ReturnType<typeof previewGroupSettlement>>;

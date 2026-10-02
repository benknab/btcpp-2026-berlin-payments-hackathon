import { calculateBalances } from "@/domain/accounting";
import type { AccountingError, ParticipantBalance } from "@/domain/accounting";
import { applySettlementPayments } from "@/domain/settlement-balances";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "./database";
import { eventInvoices, eventPayouts } from "./event-payment-schema";
import { listExpenses } from "./expenses";
import type { ExpenseView } from "./expenses";
import { getGroup } from "./groups";
import type { GroupDatabaseError, GroupError } from "./groups";

export interface GroupOverview {
  readonly entries: readonly ExpenseView[];
  readonly totalSats: number;
  readonly balances: readonly ParticipantBalance[];
}

export const getOverview = Effect.fn("getOverview")(function* getOverview(
  inviteKey: string,
): Effect.fn.Return<GroupOverview, GroupDatabaseError | GroupError | AccountingError, Database> {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* readOverview() {
      const view = yield* getGroup(inviteKey);
      const entries = yield* listExpenses(inviteKey);
      const balances = yield* calculateBalances({
        participantIds: view.participants.map((participant) => participant.id),
        expenses: entries,
        contributions: [],
      });
      const invoices = yield* database.select().from(eventInvoices).where(eq(eventInvoices.groupId, view.group.id));
      const payouts = yield* database.select().from(eventPayouts).where(eq(eventPayouts.groupId, view.group.id));
      return {
        entries,
        totalSats: entries.reduce((total, expense) => total + expense.amountSats, 0),
        balances: applySettlementPayments(balances, invoices, payouts),
      };
    }),
  );
});

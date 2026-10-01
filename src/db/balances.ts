import { calculateBalances } from "@/domain/accounting";
import type { AccountingError, ParticipantBalance } from "@/domain/accounting";
import { Effect } from "effect";

import { Database } from "./database";
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
      return { entries, totalSats: entries.reduce((total, expense) => total + expense.amountSats, 0), balances };
    }),
  );
});

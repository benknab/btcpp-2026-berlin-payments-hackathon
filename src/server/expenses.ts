import { DatabaseLive } from "@/db/database";
import { addExpense, deleteExpense, editExpense, getExpense, listExpenses } from "@/db/expenses";
import type { ExpenseView } from "@/db/expenses";
import { DeleteExpense, EditExpense, ExpenseRequest, NewExpense } from "@/domain/expense-input";
import { GroupRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { DateTime, Effect, Schema } from "effect";

import { newId } from "./group-tokens";
import { runServer } from "./telemetry";

export const groupExpenses = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<readonly ExpenseView[]> =>
    runServer("expenses.list", listExpenses(data.inviteKey).pipe(Effect.provide(DatabaseLive))),
  );

export const expenseDetail = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(ExpenseRequest))
  .handler(({ data }: { readonly data: typeof ExpenseRequest.Type }): Promise<ExpenseView> =>
    runServer("expense.read", getExpense(data.inviteKey, data.expenseId).pipe(Effect.provide(DatabaseLive))),
  );

export const expenseDraft = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ readonly id: string; readonly date: string }> => {
    const now = await Effect.runPromise(DateTime.now);
    return { id: newId(), date: DateTime.formatIsoDateUtc(now) };
  },
);

export const saveExpense = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(NewExpense))
  .handler(({ data }: { readonly data: typeof NewExpense.Type }): Promise<string> =>
    runServer("expense.create", addExpense(data).pipe(Effect.provide(DatabaseLive)), {
      expenseId: data.expenseId,
      amountSats: data.amountSats,
    }),
  );

export const updateExpense = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(EditExpense))
  .handler(({ data }: { readonly data: typeof EditExpense.Type }): Promise<void> =>
    runServer("expense.update", editExpense(data).pipe(Effect.provide(DatabaseLive)), { expenseId: data.expenseId }),
  );

export const removeExpense = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(DeleteExpense))
  .handler(({ data }: { readonly data: typeof DeleteExpense.Type }): Promise<void> =>
    runServer("expense.delete", deleteExpense(data).pipe(Effect.provide(DatabaseLive)), { expenseId: data.expenseId }),
  );

import { ExpenseForm } from "@/components/expense-form";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/expenses/$expenseId/edit")({ component: EditExpensePage });
const expenseRoute = getRouteApi("/groups/$inviteKey/expenses/$expenseId");
const groupRoute = getRouteApi("/groups/$inviteKey");

function EditExpensePage(): ReactNode {
  const expense = expenseRoute.useLoaderData();
  const view = groupRoute.useLoaderData();
  const { inviteKey } = Route.useParams();
  return (
    <ExpenseForm
      key={expense.id}
      participants={view.participants}
      locked={view.group.status !== "open"}
      options={{ inviteKey, id: expense.id, date: expense.date, payerId: expense.payerId, existing: expense }}
    />
  );
}

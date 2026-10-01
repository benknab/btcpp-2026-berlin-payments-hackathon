import { ExpenseForm } from "@/components/expense-form";
import { expenseDraft } from "@/server/expenses";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/expenses/new")({
  loader: (): ReturnType<typeof expenseDraft> => expenseDraft(),
  component: NewExpensePage,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function NewExpensePage(): ReactNode {
  const view = groupRoute.useLoaderData();
  const draft = Route.useLoaderData();
  const { inviteKey } = Route.useParams();
  return (
    <ExpenseForm
      participants={view.participants}
      locked={view.group.status !== "open"}
      options={{ inviteKey, id: draft.id, date: draft.date, payerId: view.selectedParticipantId ?? "", existing: null }}
    />
  );
}

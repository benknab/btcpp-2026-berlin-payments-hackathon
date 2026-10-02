import { ExpenseList } from "@/components/expense-list";
import { groupExpenses } from "@/server/expenses";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/expenses/")({
  loader: ({ params }): ReturnType<typeof groupExpenses> => groupExpenses({ data: { inviteKey: params.inviteKey } }),
  component: ExpensesPage,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function ExpensesPage(): ReactNode {
  const { inviteKey } = Route.useParams();
  const entries = Route.useLoaderData();
  const view = groupRoute.useLoaderData();
  return (
    <ExpenseList
      inviteKey={inviteKey}
      entries={entries}
      participants={view.participants}
      selectedParticipantId={view.selectedParticipantId}
      locked={view.group.status !== "open"}
    />
  );
}

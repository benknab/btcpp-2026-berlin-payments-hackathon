import { ExpenseDetailActions } from "@/components/expense-detail-actions";
import { SectionCard } from "@/components/section-card";
import { SummaryItem } from "@/components/summary-item";
import { formatSats } from "@/domain/money";
import { expenseDetail } from "@/server/expenses";
import { createFileRoute, getRouteApi, Outlet, useMatchRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/expenses/$expenseId")({
  loader: ({ params }): ReturnType<typeof expenseDetail> => expenseDetail({ data: params }),
  component: ExpenseDetail,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function ExpenseDetail(): ReactNode {
  const expense = Route.useLoaderData();
  const view = groupRoute.useLoaderData();
  const { inviteKey, expenseId } = Route.useParams();
  const matchRoute = useMatchRoute();
  const editing = matchRoute({ to: "/groups/$inviteKey/expenses/$expenseId/edit", params: { inviteKey, expenseId } });
  if (editing !== false) {
    return <Outlet />;
  }
  const payer = view.participants.find((person) => person.id === expense.payerId);
  const shares = (
    <>
      <p className="text-sm text-muted-foreground">
        {expense.split === null || expense.split.mode === "equal" ? "Equal split" : "Custom split"} ·{" "}
        {expense.shares.length} people
      </p>
      <dl className="flex flex-col gap-3">
        {expense.shares.map((share) => (
          <SummaryItem
            key={share.participantId}
            className="flex justify-between gap-4"
            label={view.participants.find((person) => person.id === share.participantId)?.name ?? "Participant"}
          >
            {formatSats(share.amountSats)}
          </SummaryItem>
        ))}
      </dl>
    </>
  );
  return (
    <SectionCard
      title={expense.description}
      description={`${payer?.name ?? "Participant"} paid ${formatSats(expense.amountSats)} on ${expense.date}.`}
      contentClassName="flex flex-col gap-4"
      footerClassName="flex flex-wrap gap-2"
      footer={<ExpenseDetailActions inviteKey={inviteKey} expense={expense} open={view.group.status === "open"} />}
    >
      {shares}
    </SectionCard>
  );
}

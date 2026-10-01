import { ExpenseDelete } from "@/components/expense-delete";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSats } from "@/domain/money";
import { expenseDetail } from "@/server/expenses";
import { createFileRoute, getRouteApi, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense.description}</CardTitle>
        <CardDescription>
          {payer?.name ?? "Participant"} paid {formatSats(expense.amountSats)} on {expense.date}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Split equally between {expense.shares.length} people.</p>
        <dl className="flex flex-col gap-3">
          {expense.shares.map((share) => (
            <div key={share.participantId} className="flex justify-between gap-4">
              <dt>{view.participants.find((person) => person.id === share.participantId)?.name ?? "Participant"}</dt>
              <dd className="tabular-nums">{formatSats(share.amountSats)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {view.group.status === "open" ? (
          <>
            <Link
              to="/groups/$inviteKey/expenses/$expenseId/edit"
              params={{ inviteKey, expenseId }}
              className={buttonVariants({ variant: "outline" })}
            >
              Edit expense
            </Link>
            <ExpenseDelete inviteKey={inviteKey} expense={expense} />
          </>
        ) : (
          <p>Expenses are locked for settlement.</p>
        )}
        <Link to="/groups/$inviteKey" params={{ inviteKey }} className={buttonVariants({ variant: "ghost" })}>
          Back to group
        </Link>
      </CardFooter>
    </Card>
  );
}

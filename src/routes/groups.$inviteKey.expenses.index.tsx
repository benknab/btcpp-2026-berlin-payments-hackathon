import { ExpenseList } from "@/components/expense-list";
import { buttonVariants } from "@/components/ui/button";
import { groupExpenses } from "@/server/expenses";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
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
    <>
      <Link
        to="/groups/$inviteKey"
        params={{ inviteKey }}
        className={buttonVariants({ variant: "ghost", className: "self-start" })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Back to overview
      </Link>
      <ExpenseList
        inviteKey={inviteKey}
        entries={entries}
        participants={view.participants}
        selectedParticipantId={view.selectedParticipantId}
        locked={view.group.status !== "open"}
      />
    </>
  );
}

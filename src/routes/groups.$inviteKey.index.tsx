import { ExpenseList } from "@/components/expense-list";
import { ExpenseSummary } from "@/components/expense-summary";
import { GroupInvite } from "@/components/group-invite";
import { ParticipantBalances } from "@/components/participant-balances";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { groupOverview } from "@/server/balances";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/")({
  loader: ({ params }): ReturnType<typeof groupOverview> => groupOverview({ data: { inviteKey: params.inviteKey } }),
  component: GroupHome,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function GroupHome(): ReactNode {
  const { inviteKey } = Route.useParams();
  const view = groupRoute.useLoaderData();
  const overview = Route.useLoaderData();
  return (
    <>
      <ExpenseSummary overview={overview} selectedParticipantId={view.selectedParticipantId} />
      <ExpenseList
        inviteKey={inviteKey}
        entries={overview.entries}
        participants={view.participants}
        selectedParticipantId={view.selectedParticipantId}
        locked={view.group.status !== "open"}
      />
      <ParticipantBalances participants={view.participants} balances={overview.balances} />
      <GroupInvite inviteKey={inviteKey} origin={view.origin} />
      <Alert>
        <AlertTitle>Payments aren’t connected to this group yet</AlertTitle>
        <AlertDescription>
          Expense tracking works here. The separate Bark signet settlement workspace is available from the home page,
          but group funding and payouts still need to be integrated.
        </AlertDescription>
      </Alert>
    </>
  );
}

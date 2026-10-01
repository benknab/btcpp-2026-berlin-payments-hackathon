import { ExpenseList } from "@/components/expense-list";
import { GroupInvite } from "@/components/group-invite";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { groupExpenses } from "@/server/expenses";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/")({
  loader: ({ params }): ReturnType<typeof groupExpenses> => groupExpenses({ data: { inviteKey: params.inviteKey } }),
  component: GroupHome,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function GroupHome(): ReactNode {
  const { inviteKey } = Route.useParams();
  const view = groupRoute.useLoaderData();
  const entries = Route.useLoaderData();
  return (
    <>
      <ExpenseList
        inviteKey={inviteKey}
        entries={entries}
        participants={view.participants}
        selectedParticipantId={view.selectedParticipantId}
        locked={view.group.status !== "open"}
      />
      <GroupInvite inviteKey={inviteKey} origin={view.origin} />
      <Alert>
        <AlertTitle>Shared pot coming next</AlertTitle>
        <AlertDescription>
          Funding and Bark settlement aren’t connected yet. No money can be deposited or sent from this app.
        </AlertDescription>
      </Alert>
    </>
  );
}

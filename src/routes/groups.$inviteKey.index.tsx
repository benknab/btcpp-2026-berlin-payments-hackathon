import { GroupInvite } from "@/components/group-invite";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/")({ component: GroupHome });
const groupRoute = getRouteApi("/groups/$inviteKey");

function GroupHome(): ReactNode {
  const { inviteKey } = Route.useParams();
  const view = groupRoute.useLoaderData();
  return (
    <>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Your group is ready</EmptyTitle>
          <EmptyDescription>Invite your friends. Expense recording is the next slice of this build.</EmptyDescription>
        </EmptyHeader>
      </Empty>
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

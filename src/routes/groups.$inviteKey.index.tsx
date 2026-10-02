import { ActionError } from "@/components/action-error";
import { ExpenseSummary } from "@/components/expense-summary";
import { GroupInvite } from "@/components/group-invite";
import { useLiveOverview } from "@/components/use-live-overview";
import { eventPage } from "@/server/event-page";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/")({
  loader: ({ params }): ReturnType<typeof eventPage> => eventPage({ data: { inviteKey: params.inviteKey } }),
  component: GroupHome,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function GroupHome(): ReactNode {
  const { inviteKey } = Route.useParams();
  const view = groupRoute.useLoaderData();
  const page = Route.useLoaderData();
  const { overview } = page;
  const refreshError = useLiveOverview(view.group.status !== "settled");
  return (
    <>
      <ExpenseSummary inviteKey={inviteKey} overview={overview} locked={view.group.status !== "open"} />
      <ActionError message={refreshError} />
      <GroupInvite inviteKey={inviteKey} origin={view.origin} />
    </>
  );
}

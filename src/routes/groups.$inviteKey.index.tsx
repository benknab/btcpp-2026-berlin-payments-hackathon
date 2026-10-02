import { ActionError } from "@/components/action-error";
import { ExpenseList } from "@/components/expense-list";
import { ExpenseSummary } from "@/components/expense-summary";
import { GroupInvite } from "@/components/group-invite";
import { ParticipantBalances } from "@/components/participant-balances";
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
      <ExpenseSummary overview={overview} selectedParticipantId={view.selectedParticipantId} />
      <ActionError message={refreshError} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ExpenseList
          inviteKey={inviteKey}
          entries={overview.entries}
          participants={view.participants}
          selectedParticipantId={view.selectedParticipantId}
          locked={view.group.status !== "open"}
        />
        <aside className="flex min-w-0 flex-col gap-6" aria-label="Balances and invitation">
          <ParticipantBalances
            participants={view.participants}
            balances={overview.balances}
            status={view.group.status}
            selectedParticipantId={view.selectedParticipantId}
          />
          <GroupInvite inviteKey={inviteKey} origin={view.origin} />
        </aside>
      </div>
    </>
  );
}

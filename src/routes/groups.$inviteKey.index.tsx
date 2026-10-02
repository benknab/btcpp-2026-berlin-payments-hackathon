import { ActionError } from "@/components/action-error";
import { EventPayments } from "@/components/event-payments";
import { ExpenseSummary } from "@/components/expense-summary";
import { GroupInvite } from "@/components/group-invite";
import { ParticipantBalances } from "@/components/participant-balances";
import { buttonVariants } from "@/components/ui/button";
import { useLiveOverview } from "@/components/use-live-overview";
import { eventPage } from "@/server/event-page";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
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
      <ExpenseSummary
        inviteKey={inviteKey}
        overview={overview}
        selectedParticipantId={view.selectedParticipantId}
        locked={view.group.status !== "open"}
      />
      <ParticipantBalances participants={view.participants} balances={overview.balances} status={view.group.status} />
      <ActionError message={refreshError} />
      <EventPayments inviteKey={inviteKey} view={view} page={page} />
      {page.settlement === null && (
        <Link
          to="/groups/$inviteKey/settlement"
          params={{ inviteKey }}
          className={buttonVariants({ variant: "outline" })}
        >
          Managed settlement
        </Link>
      )}
      <GroupInvite inviteKey={inviteKey} origin={view.origin} />
    </>
  );
}

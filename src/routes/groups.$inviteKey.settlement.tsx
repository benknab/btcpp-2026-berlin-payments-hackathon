import { ActionError } from "@/components/action-error";
import { EventPayments } from "@/components/event-payments";
import { ParticipantBalances } from "@/components/participant-balances";
import { buttonVariants } from "@/components/ui/button";
import { useLiveOverview } from "@/components/use-live-overview";
import { eventPage } from "@/server/event-page";
import { settlementPage } from "@/server/group-payments";
import { createFileRoute, getRouteApi, Link, redirect } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/settlement")({
  loader: async ({ params }): ReturnType<typeof eventPage> => {
    const data = { inviteKey: params.inviteKey };
    const page = await eventPage({ data });
    if (page.settlement !== null) {
      return page;
    }
    const managed = await settlementPage({ data });
    if (managed.status !== "open") {
      redirect({ to: "/groups/$inviteKey/managed-settlement", params: data, throw: true });
    }
    return page;
  },
  component: EventSettlement,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function EventSettlement(): ReactNode {
  const { inviteKey } = Route.useParams();
  const view = groupRoute.useLoaderData();
  const page = Route.useLoaderData();
  const refreshError = useLiveOverview(view.group.status !== "settled");
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
      <ParticipantBalances
        participants={view.participants}
        balances={page.overview.balances}
        status={view.group.status}
      />
      <ActionError message={refreshError} />
      <EventPayments inviteKey={inviteKey} view={view} page={page} />
      {page.settlement === null && (
        <Link
          to="/groups/$inviteKey/managed-settlement"
          params={{ inviteKey }}
          className={buttonVariants({ variant: "outline" })}
        >
          Managed settlement
        </Link>
      )}
    </>
  );
}

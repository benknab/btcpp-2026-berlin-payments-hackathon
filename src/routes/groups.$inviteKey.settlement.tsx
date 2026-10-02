import { ActionError } from "@/components/action-error";
import { EventPayments } from "@/components/event-payments";
import { EventSettlementSettings } from "@/components/event-settlement-settings";
import { useLiveOverview } from "@/components/use-live-overview";
import { eventPage } from "@/server/event-page";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/settlement")({
  loader: ({ params }): ReturnType<typeof eventPage> => eventPage({ data: { inviteKey: params.inviteKey } }),
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
      <ActionError message={refreshError} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <EventPayments inviteKey={inviteKey} view={view} page={page} />
        </div>
        <EventSettlementSettings inviteKey={inviteKey} view={view} page={page} />
      </div>
    </>
  );
}

import { EventFundingCard } from "@/components/event-funding-card";
import { EventSettlementCard } from "@/components/event-settlement-card";
import { EventWalletCard } from "@/components/event-wallet-card";
import { ExpenseList } from "@/components/expense-list";
import { ExpenseSummary } from "@/components/expense-summary";
import { GroupInvite } from "@/components/group-invite";
import { ParticipantBalances } from "@/components/participant-balances";
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
  const { overview, settlement, invoices } = Route.useLoaderData();
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
      <EventSettlementCard inviteKey={inviteKey} view={view} members={settlement} />
      {settlement !== null && <EventFundingCard inviteKey={inviteKey} members={settlement} invoices={invoices} />}
      {view.group.arkAddress !== null && (
        <EventWalletCard arkAddress={view.group.arkAddress} isOrganizer={view.isOrganizer} />
      )}
      <GroupInvite inviteKey={inviteKey} origin={view.origin} />
    </>
  );
}

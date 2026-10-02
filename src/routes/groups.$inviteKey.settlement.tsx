import { GroupSettlementControls } from "@/components/settlement/group-controls";
import { GroupSettlementPreviewCard } from "@/components/settlement/group-preview";
import { GroupSettlementProgress } from "@/components/settlement/group-progress";
import { PersonalLinks } from "@/components/settlement/personal-links";
import { buttonVariants } from "@/components/ui/button";
import { settlementPage } from "@/server/group-payments";
import { createFileRoute, getRouteApi, Link, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey/settlement")({
  loader: async ({ params }): ReturnType<typeof settlementPage> => {
    const page = await settlementPage({ data: { inviteKey: params.inviteKey } });
    if (page.browserSettlement) {
      redirect({ to: "/groups/$inviteKey", params: { inviteKey: params.inviteKey }, throw: true });
    }
    return page;
  },
  component: GroupSettlement,
});
const groupRoute = getRouteApi("/groups/$inviteKey");

function GroupSettlement(): ReactNode {
  const page = Route.useLoaderData();
  const { inviteKey } = Route.useParams();
  const view = groupRoute.useLoaderData();
  return (
    <>
      <h2 className="text-2xl font-semibold">Settle up</h2>
      <GroupSettlementProgress page={page} participantId={view.selectedParticipantId} />
      <GroupSettlementControls inviteKey={inviteKey} page={page} isOrganizer={view.isOrganizer} />
      <GroupSettlementPreviewCard preview={page.preview} />
      {view.isOrganizer && page.status === "open" ? (
        <PersonalLinks inviteKey={inviteKey} origin={view.origin} users={page.preview.snapshot.users} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        Signet-only custodial demo. One isolated Bark wallet per pot. Excess deposits remain in the pot; automatic
        refunds and fee allocation are not supported. Fees or unavailable funds can block payout—ask the organizer to
        inspect the wallet, never alter locked amounts.
      </p>
      <Link to="/groups/$inviteKey" params={{ inviteKey }} className={buttonVariants({ variant: "ghost" })}>
        Back to group
      </Link>
    </>
  );
}

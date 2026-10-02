import { EventFeeReserve } from "@/components/event-fee-reserve";
import { EventReceivingAddress } from "@/components/event-receiving-address";
import { ParticipantBalances } from "@/components/participant-balances";
import { SectionCard } from "@/components/section-card";
import type { EventPageData } from "@/server/event-page";
import type { GroupPageData } from "@/server/groups";
import type { ReactNode } from "react";

export function EventSettlementSettings({
  inviteKey,
  view,
  page,
}: {
  readonly inviteKey: string;
  readonly view: GroupPageData;
  readonly page: EventPageData;
}): ReactNode {
  const selected = view.participants.find((participant) => participant.id === view.selectedParticipantId);
  return (
    <aside className="flex min-w-0 flex-col gap-6" aria-label="Balances and payment settings">
      <ParticipantBalances
        participants={view.participants}
        balances={page.overview.balances}
        status={view.group.status}
        selectedParticipantId={view.selectedParticipantId}
      />
      {selected !== undefined &&
        view.group.arkAddress !== null &&
        view.group.status !== "settled" &&
        (selected.position !== 0 || view.isOrganizer) && (
          <SectionCard title="Receiving address">
            <EventReceivingAddress
              key={`${selected.id}:${selected.lnurl}`}
              inviteKey={inviteKey}
              participant={selected}
            />
          </SectionCard>
        )}
      {view.isOrganizer && view.group.arkAddress !== null && view.group.status !== "settled" && (
        <EventFeeReserve inviteKey={inviteKey} arkAddress={view.group.arkAddress} page={page} />
      )}
    </aside>
  );
}

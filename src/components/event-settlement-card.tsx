import type { GroupView } from "@/db/groups";
import { formatSats } from "@/domain/money";
import type { EventPageData } from "@/server/event-page";
import { lockEvent } from "@/server/event-settlement";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { EventReceivingAddress } from "./event-receiving-address";
import { SectionCard } from "./section-card";
import { Button } from "./ui/button";
import { useEventAction } from "./use-event-action";

export function EventSettlementCard({
  inviteKey,
  view,
  members,
  payouts,
}: {
  readonly inviteKey: string;
  readonly view: GroupView;
  readonly members: EventPageData["settlement"];
  readonly payouts: EventPageData["payouts"];
}): ReactNode {
  const action = useEventAction();
  function handleLock(): void {
    action.run(async () => {
      await lockEvent({ data: { inviteKey } });
    }, "Could not start settlement. Everyone receiving sats needs a receiving address.");
  }
  if (members !== null) {
    return (
      <SectionCard title="Settlement" contentClassName="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.participantId}>
              {member.name}:{" "}
              {member.payInSats > 0
                ? `Pay ${formatSats(member.payInSats)}`
                : `Receive ${formatSats(member.receiveSats)}`}
            </li>
          ))}
        </ul>
        {view.isOrganizer &&
          view.group.status === "settling" &&
          view.participants
            .filter(
              (participant) =>
                members.some((member) => member.participantId === participant.id && member.receiveSats > 0) &&
                !payouts.some(
                  (payout) =>
                    payout.participantId === participant.id &&
                    (payout.status === "sending" || payout.status === "paid"),
                ),
            )
            .map((participant) => (
              <EventReceivingAddress
                key={`${participant.id}:${participant.lnurl}`}
                inviteKey={inviteKey}
                participant={participant}
              />
            ))}
      </SectionCard>
    );
  }
  if (!view.isOrganizer || view.group.arkAddress === null) {
    return null;
  }
  return (
    <SectionCard title="Settlement" contentClassName="flex flex-col gap-4">
      {view.participants.map((participant) => (
        <EventReceivingAddress key={participant.id} inviteKey={inviteKey} participant={participant} />
      ))}
      <Button disabled={action.pending} onClick={handleLock}>
        Start settlement
      </Button>
      <ActionError message={action.error} />
    </SectionCard>
  );
}

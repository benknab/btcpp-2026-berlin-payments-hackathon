import { MessageAlert } from "@/components/message-alert";
import { DepositCard } from "@/components/settlement/deposit-card";
import { PotSummary } from "@/components/settlement/pot-summary";
import type { GroupSettlementPage } from "@/db/group-settlements";
import { participantPayoutLabel } from "@/lib/settlement";
import type { ReactNode } from "react";

import { groupProgressMessage } from "./group-progress-message";

export function GroupSettlementProgress({
  page,
  participantId,
}: Readonly<{ page: GroupSettlementPage; participantId: string | null }>): ReactNode {
  const message = groupProgressMessage(page);
  const personal = page.pot?.participants.find((person) => person.userId === participantId);
  return (
    <>
      <MessageAlert title={message.title}>{message.description}</MessageAlert>
      {personal !== undefined && personal.payInSat > 0 && <DepositCard participant={personal} />}
      {personal !== undefined && personal.receiveSat > 0 && (
        <MessageAlert title={`You receive ${personal.receiveSat.toLocaleString()} sats`}>
          {participantPayoutLabel(personal)}
        </MessageAlert>
      )}
      {page.pot !== null && <PotSummary pot={page.pot} />}
    </>
  );
}

import { LabeledField } from "@/components/labeled-field";
import { SectionCard } from "@/components/section-card";
import { CopyAddress } from "@/components/settlement/copy-address";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PotParticipant } from "@/lib/pot";
import type { ReactNode } from "react";

export function DepositCard({ participant }: Readonly<{ participant: PotParticipant }>): ReactNode {
  const paid = participant.receivedSat >= participant.payInSat;
  const remaining = Math.max(0, participant.payInSat - participant.receivedSat);
  return (
    <SectionCard
      size="sm"
      title={`${participant.name} pays ${participant.payInSat.toLocaleString()} sats`}
      description={`${participant.receivedSat.toLocaleString()} sats confirmed · ${remaining.toLocaleString()} sats remaining`}
      action={<Badge variant={paid ? "default" : "outline"}>{paid ? "Paid in full" : "Awaiting deposit"}</Badge>}
      footer={<CopyAddress address={participant.depositAddress} />}
    >
      <FieldGroup>
        <LabeledField
          id={`deposit-${participant.userId}`}
          label={`Pot deposit address for ${participant.name}`}
          description="Send only signet Ark sats to this address, not to a participant’s payout address. Click “Check deposits” after paying."
        >
          <Input id={`deposit-${participant.userId}`} value={participant.depositAddress} readOnly spellCheck={false} />
        </LabeledField>
      </FieldGroup>
    </SectionCard>
  );
}

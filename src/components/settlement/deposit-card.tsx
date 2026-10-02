import { ReadOnlyField } from "@/components/read-only-field";
import { SectionCard } from "@/components/section-card";
import { CopyAddress } from "@/components/settlement/copy-address";
import { PaymentQr } from "@/components/settlement/payment-qr";
import { Badge } from "@/components/ui/badge";
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
      contentClassName="flex flex-col gap-4"
    >
      {paid ? null : <PaymentQr address={participant.depositAddress} remainingSat={remaining} />}
      <ReadOnlyField
        id={`deposit-${participant.userId}`}
        label={`Pot deposit address for ${participant.name}`}
        value={participant.depositAddress}
        spellCheck={false}
        description="Send only mainnet Ark sats to this address. Check deposits after paying."
      />
    </SectionCard>
  );
}

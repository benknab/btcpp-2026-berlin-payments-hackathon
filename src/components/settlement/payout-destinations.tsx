import { LabeledField } from "@/components/labeled-field";
import { Input } from "@/components/ui/input";
import type { Pot } from "@/lib/pot";
import type { ReactNode } from "react";

export function PayoutDestinations({ pot }: Readonly<{ pot: Pot }>): ReactNode {
  return pot.participants
    .filter((participant) => participant.receiveSat > 0)
    .map((participant) => (
      <LabeledField
        key={participant.userId}
        id={`payout-${participant.userId}`}
        label={`${participant.name} receives ${participant.receiveSat.toLocaleString()} sats`}
        description={
          participant.payoutStatus === "paid" ? "Payout confirmed by Bark." : "Locked personal signet payout address."
        }
      >
        <Input id={`payout-${participant.userId}`} value={participant.payoutAddress} readOnly spellCheck={false} />
      </LabeledField>
    ));
}

import { ParticipantBalanceRow } from "@/components/participant-balance-row";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import type { ParticipantData } from "@/db/groups";
import type { ParticipantBalance } from "@/domain/accounting";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

export function ParticipantBalances({
  participants,
  balances,
  status,
  selectedParticipantId,
}: {
  readonly participants: readonly ParticipantData[];
  readonly balances: readonly ParticipantBalance[];
  readonly status: string;
  readonly selectedParticipantId?: string | null;
}): ReactNode {
  const remaining = balances.reduce((sum, balance) => sum + Math.max(0, balance.settlementSats), 0);
  return (
    <SectionCard
      title="Balances"
      action={status === "settled" ? <Badge variant="secondary">Settled</Badge> : undefined}
      contentClassName="flex flex-col gap-4"
      footer={
        status === "open" ? undefined : (
          <p className="text-muted-foreground">
            Remaining payouts: <span className="font-medium text-foreground tabular-nums">{formatSats(remaining)}</span>
          </p>
        )
      }
    >
      <ul className="flex flex-col divide-y" aria-live="polite">
        {participants.map((person) => (
          <ParticipantBalanceRow
            key={person.id}
            person={person}
            balance={balances.find((entry) => entry.participantId === person.id)}
            isYou={person.id === selectedParticipantId}
          />
        ))}
      </ul>
    </SectionCard>
  );
}

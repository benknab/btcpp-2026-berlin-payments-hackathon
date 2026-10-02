import { SectionCard } from "@/components/section-card";
import { SummaryItem } from "@/components/summary-item";
import type { ParticipantData } from "@/db/groups";
import type { ParticipantBalance } from "@/domain/accounting";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

function describeBalance(amount: number): string {
  if (amount === 0) {
    return formatSats(0);
  }
  return amount > 0 ? `Owed ${formatSats(amount)}` : `Owes ${formatSats(Math.abs(amount))}`;
}

export function ParticipantBalances({
  participants,
  balances,
}: {
  readonly participants: readonly ParticipantData[];
  readonly balances: readonly ParticipantBalance[];
}): ReactNode {
  return (
    <SectionCard title="Balances">
      <dl className="flex flex-col gap-3 text-sm">
        {participants.map((person) => (
          <SummaryItem key={person.id} label={person.name} className="flex flex-wrap justify-between gap-2">
            {describeBalance(balances.find((balance) => balance.participantId === person.id)?.expenseBalanceSats ?? 0)}
          </SummaryItem>
        ))}
      </dl>
    </SectionCard>
  );
}

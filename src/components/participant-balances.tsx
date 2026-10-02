import { SectionCard } from "@/components/section-card";
import { SummaryItem } from "@/components/summary-item";
import { Badge } from "@/components/ui/badge";
import type { ParticipantData } from "@/db/groups";
import type { ParticipantBalance } from "@/domain/accounting";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

function describeBalance(amount: number): string {
  if (amount === 0) {
    return "Settled";
  }
  return amount > 0
    ? `Receives ${formatSats(amount)} from the pot`
    : `Contributes ${formatSats(Math.abs(amount))} to the pot`;
}

export function ParticipantBalances({
  participants,
  balances,
  status,
}: {
  readonly participants: readonly ParticipantData[];
  readonly balances: readonly ParticipantBalance[];
  readonly status: string;
}): ReactNode {
  const recipients = balances.filter((balance) => balance.settlementSats > 0);
  const total = recipients.reduce((sum, balance) => sum + balance.settlementSats, 0);
  const active = balances.filter((balance) => balance.settlementSats !== 0 || balance.expenseBalanceSats !== 0);
  return (
    <SectionCard
      title={status === "settled" ? "Settlement complete" : "Active settlement"}
      action={
        <Badge variant="secondary">
          {`${recipients.length} ${recipients.length === 1 ? "payout" : "payouts"} remaining`}
        </Badge>
      }
      contentClassName="flex flex-col gap-4"
    >
      <dl className="flex flex-col divide-y text-sm" aria-live="polite">
        <SummaryItem label="Remaining payouts" className="flex flex-wrap justify-between gap-2 pb-4 font-medium">
          {formatSats(total)}
        </SummaryItem>
        {active.map((balance) => (
          <SummaryItem
            key={balance.participantId}
            label={participants.find((person) => person.id === balance.participantId)?.name ?? "Participant"}
            className="flex flex-wrap justify-between gap-2 py-4 last:pb-0"
          >
            {describeBalance(balance.settlementSats)}
          </SummaryItem>
        ))}
      </dl>
      {active.length === 0 && <p className="text-sm text-muted-foreground">Everyone is square.</p>}
    </SectionCard>
  );
}

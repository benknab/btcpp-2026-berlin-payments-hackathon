import { SectionCard } from "@/components/section-card";
import { SummaryItem } from "@/components/summary-item";
import type { GroupOverview } from "@/db/balances";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

export function ExpenseSummary({
  overview,
  selectedParticipantId,
}: {
  readonly overview: GroupOverview;
  readonly selectedParticipantId: string | null;
}): ReactNode {
  const personal = overview.balances.find((balance) => balance.participantId === selectedParticipantId);
  const net = personal?.expenseBalanceSats ?? 0;
  const balanceLabel = net >= 0 ? "You are owed" : "You owe";
  return (
    <SectionCard title="Summary" contentClassName="flex flex-col gap-4">
      <dl className="flex flex-col gap-3 text-sm">
        <SummaryItem
          label="Total expenses"
          className="flex justify-between gap-4"
          labelClassName="text-muted-foreground"
        >
          {formatSats(overview.totalSats)}
        </SummaryItem>
        <SummaryItem label="Your share" className="flex justify-between gap-4" labelClassName="text-muted-foreground">
          {formatSats(personal?.shareSats ?? 0)}
        </SummaryItem>
        <SummaryItem label="You paid" className="flex justify-between gap-4" labelClassName="text-muted-foreground">
          {formatSats(personal?.paidSats ?? 0)}
        </SummaryItem>
        <SummaryItem label={net === 0 ? "Balance" : balanceLabel} className="flex justify-between gap-4 font-medium">
          {formatSats(Math.abs(net))}
        </SummaryItem>
      </dl>
    </SectionCard>
  );
}

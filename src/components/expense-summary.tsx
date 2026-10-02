import { SectionCard } from "@/components/section-card";
import { SummaryItem } from "@/components/summary-item";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { GroupOverview } from "@/db/balances";
import { formatSats } from "@/domain/money";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function ExpenseSummary({
  overview,
  selectedParticipantId,
  inviteKey,
  locked,
}: {
  readonly overview: GroupOverview;
  readonly selectedParticipantId: string | null;
  readonly inviteKey: string;
  readonly locked: boolean;
}): ReactNode {
  const personal = overview.balances.find((balance) => balance.participantId === selectedParticipantId);
  const net = personal?.settlementSats ?? 0;
  const balanceLabel = net >= 0 ? "You receive from the pot" : "You contribute to the pot";
  return (
    <SectionCard
      title="Overview"
      contentClassName="flex flex-col gap-4"
      action={
        <Badge variant="secondary">
          {`${overview.entries.length} ${overview.entries.length === 1 ? "expense" : "expenses"}`}
        </Badge>
      }
      footerClassName="flex flex-wrap justify-end gap-2"
      footer={
        <>
          <Link
            to="/groups/$inviteKey/expenses"
            params={{ inviteKey }}
            className={buttonVariants({ variant: "outline" })}
          >
            View expenses
          </Link>
          {!locked && (
            <Link to="/groups/$inviteKey/expenses/new" params={{ inviteKey }} className={buttonVariants()}>
              Add expense
            </Link>
          )}
        </>
      }
    >
      <dl className="flex flex-col gap-3 text-sm">
        <SummaryItem label="Event cost" className="flex justify-between gap-4" labelClassName="text-muted-foreground">
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

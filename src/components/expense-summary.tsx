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
  inviteKey,
  locked,
}: {
  readonly overview: GroupOverview;
  readonly inviteKey: string;
  readonly locked: boolean;
}): ReactNode {
  const recipients = overview.balances.filter((balance) => balance.settlementSats > 0);
  const remaining = recipients.reduce((total, balance) => total + balance.settlementSats, 0);
  return (
    <SectionCard
      title="Overview"
      contentClassName="flex flex-col gap-4"
      action={
        <Badge variant="secondary">
          {`${overview.entries.length} ${overview.entries.length === 1 ? "expense" : "expenses"}`}
        </Badge>
      }
      footerClassName="flex flex-wrap gap-2"
      footer={
        <>
          <Link
            to="/groups/$inviteKey/expenses"
            params={{ inviteKey }}
            className={buttonVariants({ variant: "outline" })}
          >
            View expenses
          </Link>
          <Link
            to="/groups/$inviteKey/settlement"
            params={{ inviteKey }}
            className={buttonVariants({ variant: "outline" })}
          >
            View settlement
          </Link>
          {!locked && (
            <Link to="/groups/$inviteKey/expenses/new" params={{ inviteKey }} className={buttonVariants()}>
              Add expense
            </Link>
          )}
        </>
      }
    >
      <dl className="flex flex-col gap-3 text-sm" aria-live="polite">
        <SummaryItem label="Total spent" className="flex justify-between gap-4" labelClassName="text-muted-foreground">
          {formatSats(overview.totalSats)}
        </SummaryItem>
        <SummaryItem
          label="Active settlement"
          className="flex flex-wrap justify-between gap-2"
          labelClassName="text-muted-foreground"
        >
          {`${recipients.length} ${recipients.length === 1 ? "payout" : "payouts"} · ${formatSats(remaining)}`}
        </SummaryItem>
      </dl>
    </SectionCard>
  );
}

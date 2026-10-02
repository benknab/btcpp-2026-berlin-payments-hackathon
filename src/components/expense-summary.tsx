import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Total expenses</dt>
            <dd className="tabular-nums">{formatSats(overview.totalSats)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Your share</dt>
            <dd className="tabular-nums">{formatSats(personal?.shareSats ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">You paid</dt>
            <dd className="tabular-nums">{formatSats(personal?.paidSats ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-medium">
            <dt>{net === 0 ? "Balance" : balanceLabel}</dt>
            <dd className="tabular-nums">{formatSats(Math.abs(net))}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

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
  const balance = overview.balances.find((entry) => entry.participantId === selectedParticipantId)?.settlementSats ?? 0;
  let balanceLabel = "Your balance";
  if (balance !== 0) {
    balanceLabel = balance > 0 ? "You get back" : "You owe";
  }
  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader className="sr-only">
        <CardTitle>
          <h2>Event summary</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3" aria-live="polite">
          <div className="flex min-w-0 flex-col gap-1.5">
            <dt className="text-muted-foreground">Total spent</dt>
            <dd className="text-2xl font-semibold tracking-tight break-words tabular-nums">
              {formatSats(overview.totalSats)}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <dt className="text-muted-foreground">Expenses</dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">{overview.entries.length}</dd>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1">
            <dt className="text-muted-foreground">{balanceLabel}</dt>
            <dd className="text-2xl font-semibold tracking-tight break-words tabular-nums">
              {formatSats(Math.abs(balance))}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

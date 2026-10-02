import { Badge } from "@/components/ui/badge";
import type { ParticipantData } from "@/db/groups";
import type { ParticipantBalance } from "@/domain/accounting";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

export function ParticipantBalanceRow({
  person,
  balance,
  isYou,
}: {
  readonly person: ParticipantData;
  readonly balance: ParticipantBalance | undefined;
  readonly isYou: boolean;
}): ReactNode {
  const amount = balance?.settlementSats ?? 0;
  let label = "No outstanding balance";
  if (amount !== 0) {
    label = amount > 0 ? "Gets back" : "Owes";
  }
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium break-words">{person.name}</span>
          {isYou && <Badge variant="outline">You</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="shrink-0 font-semibold tabular-nums">{formatSats(Math.abs(amount))}</span>
    </li>
  );
}

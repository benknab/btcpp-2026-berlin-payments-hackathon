import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupSettlementPreview } from "@/db/group-settlement-preview";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

export function GroupSettlementPreviewCard({ preview }: Readonly<{ preview: GroupSettlementPreview }>): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement preview · {formatSats(preview.totalSat)}</CardTitle>
        <CardDescription>
          What you paid minus your share. Net debtors fund the pot; net creditors receive payouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {preview.snapshot.users.map((person) => {
          const amount =
            preview.balances.find((balance) => balance.participantId === person.id)?.expenseBalanceSats ?? 0;
          return (
            <section key={person.id} className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {person.name}:{" "}
                {amount === 0 ? "all square" : `${amount > 0 ? "receives" : "pays"} ${formatSats(Math.abs(amount))}`}
              </p>
              <p className="text-xs break-all text-muted-foreground">
                {person.arkAddress ?? "Personal Bark address not provided yet"}
              </p>
            </section>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Each participant supplies their own signet address through a private link. Closing is permanent: expenses and
          destinations lock before deposit instructions are issued.
        </p>
      </CardContent>
    </Card>
  );
}

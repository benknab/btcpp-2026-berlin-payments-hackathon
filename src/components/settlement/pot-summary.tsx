import { SectionCard } from "@/components/section-card";
import { PotSummaryTable } from "@/components/settlement/pot-summary-table";
import { Badge } from "@/components/ui/badge";
import type { Pot } from "@/lib/pot";
import { remainingDepositSat, potStatusLabel } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotSummary({ pot }: Readonly<{ pot: Pot }>): ReactNode {
  return (
    <SectionCard
      title={`Locked settlement · ${pot.totalSat.toLocaleString()} sats`}
      description={`Pot ${pot.id}. Debts and payout addresses cannot change after creation.`}
      footerClassName="flex flex-wrap justify-between gap-3"
      footer={
        <>
          <Badge variant={pot.status === "settled" ? "default" : "secondary"}>{potStatusLabel(pot)}</Badge>
          <p className="text-sm text-muted-foreground">
            {remainingDepositSat(pot).toLocaleString()} sats still required
          </p>
        </>
      }
    >
      <PotSummaryTable pot={pot} />
    </SectionCard>
  );
}

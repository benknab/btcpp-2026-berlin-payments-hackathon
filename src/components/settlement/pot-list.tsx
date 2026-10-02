import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { PotListTable } from "@/components/settlement/pot-list-table";
import type { SettlementSummary } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotList({ pots }: Readonly<{ pots: readonly SettlementSummary[] }>): ReactNode {
  if (pots.length === 0) {
    return <EmptyState title="No pots yet" description="Start a new pot to add users and who owes whom." />;
  }
  return (
    <SectionCard title="Your pots" description="Open a pot to view its users, debts, and payment progress.">
      <PotListTable pots={pots} />
    </SectionCard>
  );
}

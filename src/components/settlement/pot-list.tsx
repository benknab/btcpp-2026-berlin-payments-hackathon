import { SectionCard } from "@/components/section-card";
import { PotListRow } from "@/components/settlement/pot-list-row";
import { TableHeading } from "@/components/table-heading";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCaption, TableHead } from "@/components/ui/table";
import type { SettlementSummary } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotList({ pots }: Readonly<{ pots: readonly SettlementSummary[] }>): ReactNode {
  if (pots.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No pots yet</EmptyTitle>
          <EmptyDescription>Start a new pot to add users and who owes whom.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const table = (
    <Table>
      <TableCaption>Pots are saved in SQLite and remain available after a reload.</TableCaption>
      <TableHeading>
        <TableHead>Pot</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Stage</TableHead>
        <TableHead>Created</TableHead>
      </TableHeading>
      <TableBody>
        {pots.map((pot) => (
          <PotListRow key={pot.id} pot={pot} />
        ))}
      </TableBody>
    </Table>
  );
  return (
    <SectionCard title="Your pots" description="Open a pot to view its users, debts, and payment progress.">
      {table}
    </SectionCard>
  );
}

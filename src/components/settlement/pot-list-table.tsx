import { PotListRow } from "@/components/settlement/pot-list-row";
import { TableHeading } from "@/components/table-heading";
import { Table, TableBody, TableCaption, TableHead } from "@/components/ui/table";
import type { SettlementSummary } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotListTable({ pots }: Readonly<{ pots: readonly SettlementSummary[] }>): ReactNode {
  return (
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
}

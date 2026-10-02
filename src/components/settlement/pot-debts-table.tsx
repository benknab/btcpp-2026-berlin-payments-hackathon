import { TableHeading } from "@/components/table-heading";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { SettlementDocument } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotDebtsTable({ pot }: Readonly<{ pot: SettlementDocument }>): ReactNode {
  const names = new Map(pot.users.map((user): readonly [number, string] => [user.id, user.name]));
  const rows = pot.debts.map((debt) => (
    <TableRow key={debt.id}>
      <TableCell>{names.get(debt.fromUserId)}</TableCell>
      <TableCell>{names.get(debt.toUserId)}</TableCell>
      <TableCell className="text-right">{debt.amountSat.toLocaleString()}</TableCell>
    </TableRow>
  ));
  return (
    <Table>
      <TableCaption>Who owes whom, before debts are netted.</TableCaption>
      <TableHeading>
        <TableHead>Who owes</TableHead>
        <TableHead>Owes whom</TableHead>
        <TableHead className="text-right">Sats</TableHead>
      </TableHeading>
      <TableBody>{rows}</TableBody>
    </Table>
  );
}

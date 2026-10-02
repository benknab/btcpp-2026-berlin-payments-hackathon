import { TableHeading } from "@/components/table-heading";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { SettlementDocument } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotUsersTable({ users }: Readonly<{ users: SettlementDocument["users"] }>): ReactNode {
  const rows = users.map((user) => (
    <TableRow key={user.id}>
      <TableCell>{user.name}</TableCell>
      <TableCell className="max-w-xs break-all whitespace-normal">{user.arkAddress}</TableCell>
    </TableRow>
  ));
  return (
    <Table>
      <TableCaption>Each user’s personal mainnet payout address.</TableCaption>
      <TableHeading>
        <TableHead>User</TableHead>
        <TableHead>Payout address</TableHead>
      </TableHeading>
      <TableBody>{rows}</TableBody>
    </Table>
  );
}

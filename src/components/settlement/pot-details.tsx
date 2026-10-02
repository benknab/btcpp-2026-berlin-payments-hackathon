import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SettlementDocument } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotDetails({ pot }: Readonly<{ pot: SettlementDocument }>): ReactNode {
  const names = new Map(pot.users.map((user): readonly [number, string] => [user.id, user.name]));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users and debts</CardTitle>
        <CardDescription>Saved in pot #{pot.id}. These details are locked for settlement.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Table>
          <TableCaption>Each user’s personal signet payout address.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Payout address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pot.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell className="max-w-xs break-all whitespace-normal">{user.arkAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Table>
          <TableCaption>Who owes whom, before debts are netted.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Who owes</TableHead>
              <TableHead>Owes whom</TableHead>
              <TableHead className="text-right">Sats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pot.debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>{names.get(debt.fromUserId)}</TableCell>
                <TableCell>{names.get(debt.toUserId)}</TableCell>
                <TableCell className="text-right">{debt.amountSat.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Wallets, deposit receipts, and payouts are managed by the backend.
        </p>
      </CardFooter>
    </Card>
  );
}

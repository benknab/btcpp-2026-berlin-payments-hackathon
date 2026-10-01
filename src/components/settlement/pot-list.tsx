import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SettlementSummary } from "@/lib/settlement";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function potStage(pot: SettlementSummary): string {
  if (pot.status === "settled") {
    return "Complete";
  }
  return pot.locked ? "Debts saved" : "Set up debts";
}

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your pots</CardTitle>
        <CardDescription>Open a pot to view its users, debts, and payment progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>Pots are saved in SQLite and remain available after a reload.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Pot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pots.map((pot) => (
              <TableRow key={pot.id}>
                <TableCell>
                  <Link to="/settle/$potId" params={{ potId: String(pot.id) }} className="underline underline-offset-4">
                    Pot #{pot.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={pot.status === "settled" ? "default" : "secondary"}>
                    {pot.status === "settled" ? "Settled" : "Unsettled"}
                  </Badge>
                </TableCell>
                <TableCell>{potStage(pot)}</TableCell>
                <TableCell>{pot.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

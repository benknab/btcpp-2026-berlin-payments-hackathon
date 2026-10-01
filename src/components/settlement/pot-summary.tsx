import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Pot } from "@/lib/pot";
import { remainingDepositSat, participantPayoutLabel, potStatusLabel } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotSummary({ pot }: Readonly<{ pot: Pot }>): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Locked settlement · {pot.totalSat.toLocaleString()} sats</CardTitle>
        <CardDescription>Pot {pot.id}. Debts and payout addresses cannot change after creation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            Only receipts at each person’s assigned pot address count toward their contribution.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Pay in</TableHead>
              <TableHead>Confirmed</TableHead>
              <TableHead>Receive</TableHead>
              <TableHead>Payout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pot.participants.map((participant) => (
              <TableRow key={participant.userId}>
                <TableCell>{participant.name}</TableCell>
                <TableCell>{participant.payInSat.toLocaleString()} sats</TableCell>
                <TableCell>{participant.receivedSat.toLocaleString()} sats</TableCell>
                <TableCell>{participant.receiveSat.toLocaleString()} sats</TableCell>
                <TableCell>{participantPayoutLabel(participant)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-3">
        <Badge variant={pot.status === "settled" ? "default" : "secondary"}>{potStatusLabel(pot)}</Badge>
        <p className="text-sm text-muted-foreground">{remainingDepositSat(pot).toLocaleString()} sats still required</p>
      </CardFooter>
    </Card>
  );
}

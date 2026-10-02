import { TableHeading } from "@/components/table-heading";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { Pot } from "@/lib/pot";
import { participantPayoutLabel } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotSummaryTable({ pot }: Readonly<{ pot: Pot }>): ReactNode {
  const rows = pot.participants.map((participant) => (
    <TableRow key={participant.userId}>
      <TableCell>{participant.name}</TableCell>
      <TableCell>{participant.payInSat.toLocaleString()} sats</TableCell>
      <TableCell>{participant.receivedSat.toLocaleString()} sats</TableCell>
      <TableCell>{participant.receiveSat.toLocaleString()} sats</TableCell>
      <TableCell>{participantPayoutLabel(participant)}</TableCell>
    </TableRow>
  ));
  return (
    <Table>
      <TableCaption>Only receipts at each person’s assigned pot address count toward their contribution.</TableCaption>
      <TableHeading>
        <TableHead>Participant</TableHead>
        <TableHead>Pay in</TableHead>
        <TableHead>Confirmed</TableHead>
        <TableHead>Receive</TableHead>
        <TableHead>Payout</TableHead>
      </TableHeading>
      <TableBody>{rows}</TableBody>
    </Table>
  );
}

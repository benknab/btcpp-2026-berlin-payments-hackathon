import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { SettlementSummary } from "@/lib/settlement";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function potStage(pot: SettlementSummary): string {
  if (pot.status === "settled") {
    return "Complete";
  }
  return pot.locked ? "Debts saved" : "Set up debts";
}

export function PotListRow({ pot }: Readonly<{ pot: SettlementSummary }>): ReactNode {
  return (
    <TableRow>
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
  );
}

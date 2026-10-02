import { TableHeader, TableRow } from "@/components/ui/table";
import type { ReactNode } from "react";

export function TableHeading({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <TableHeader>
      <TableRow>{children}</TableRow>
    </TableHeader>
  );
}

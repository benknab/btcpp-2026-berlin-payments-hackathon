import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function MissingPot(): ReactNode {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Pot not found</EmptyTitle>
        <EmptyDescription>Open the pot list or start a new pot.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/settle" className={buttonVariants({ variant: "outline" })}>
          All pots
        </Link>
      </EmptyContent>
    </Empty>
  );
}

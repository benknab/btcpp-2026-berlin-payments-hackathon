import { NewPotButton } from "@/components/settlement/new-pot-button";
import { PotList } from "@/components/settlement/pot-list";
import { getSettlements } from "@/server/settlement";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/settle/")({
  loader: (): ReturnType<typeof getSettlements> => getSettlements(),
  component: SettlementsPage,
});

function SettlementsPage(): ReactNode {
  const pots = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-6">
      <NewPotButton />
      <PotList pots={pots} />
    </div>
  );
}

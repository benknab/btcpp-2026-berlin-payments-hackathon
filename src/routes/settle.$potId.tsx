import { MissingPot } from "@/components/settlement/missing-pot";
import { SettlementScreen } from "@/components/settlement/settlement-screen";
import { buttonVariants } from "@/components/ui/button";
import { SettlementId } from "@/lib/settlement";
import { getSettlement } from "@/server/settlement";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Schema } from "effect";
import type { ReactNode } from "react";

export const Route = createFileRoute("/settle/$potId")({
  loader: async ({ params }): ReturnType<typeof getSettlement> => {
    if (!/^\d+$/u.test(params.potId) || !Schema.is(SettlementId)(Number(params.potId))) {
      notFound({ throw: true });
      return null;
    }
    const pot = await getSettlement({ data: { id: Number(params.potId) } });
    if (pot === null) {
      notFound({ throw: true });
    }
    return pot;
  },
  component: PotPage,
  notFoundComponent: MissingPot,
});

function PotPage(): ReactNode {
  const pot = Route.useLoaderData();
  if (pot === null) {
    return <MissingPot />;
  }
  return (
    <div className="flex flex-col gap-6">
      <Link to="/settle" className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
        All pots
      </Link>
      <SettlementScreen key={pot.id} initialPot={pot} />
    </div>
  );
}

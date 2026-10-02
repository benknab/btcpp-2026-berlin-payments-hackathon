import type { ReactNode } from "react";

export function HomeSettlementSteps(): ReactNode {
  return (
    <section className="mt-3 flex flex-col gap-3" aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="text-sm font-medium">
        How it works
      </h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
        <li>
          Create an event. The owner gets a Bark wallet in their browser and can back it up with a recovery phrase.
        </li>
        <li>Add expenses and choose how to split them.</li>
        <li>
          Settle up. Participants who owe money pay the owner via Lightning. Bark’s receive-for-address flow delivers
          payments even when the owner’s browser is closed.
        </li>
        <li>
          The owner pays participants from their Bark wallet to Lightning addresses, LNURL-pay, BOLT12 offers, or Ark
          addresses.
        </li>
      </ol>
    </section>
  );
}

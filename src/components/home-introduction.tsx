import { HomeSettlementSteps } from "@/components/home-settlement-steps";
import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export function HomeIntroduction(): ReactNode {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-normal">Splitbark</h1>
        <a
          href="https://github.com/benknab/btcpp-2026-berlin-payments-hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          GitHub
          <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
        </a>
      </div>
      <p className="text-muted-foreground">
        Track shared expenses, split costs, and settle up with Bitcoin using Lightning and Bark.
      </p>
      <p className="text-sm text-muted-foreground">
        Splitbark is a shared-expense app built for trips, dinners, and events. Create an event, invite friends, and
        track who paid and who owes what, with equal, exact, weighted, or percentage splits.
      </p>
      <p className="text-sm text-muted-foreground">
        When it’s time to settle, participants pay into a shared pot over Lightning. The event owner manages a
        browser-based Bark wallet and pays recipients through Lightning addresses, Ark addresses, or BOLT12 offers.
      </p>
      <p className="text-sm text-muted-foreground">
        Wallet keys stay in the owner’s browser. Bark’s receive-for-address flow lets contributions arrive even while
        that browser is closed, and a recovery phrase can restore spendable Ark funds in another browser.
      </p>
      <p className="text-sm text-muted-foreground">
        Built for the{" "}
        <a
          href="https://btcpp.dev/berlin26/hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          bitcoin++ Berlin 2026 payments hackathon
        </a>
        .
      </p>
      <HomeSettlementSteps />
    </header>
  );
}

import { HomeSettlementSteps } from "@/components/home-settlement-steps";
import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export function HomeIntroduction(): ReactNode {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-normal">Splitbark</h1>
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

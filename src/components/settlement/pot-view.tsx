import { DepositCard } from "@/components/settlement/deposit-card";
import { PayoutPanel } from "@/components/settlement/payout-panel";
import { PotSummary } from "@/components/settlement/pot-summary";
import type { Pot } from "@/lib/pot";
import type { ReactNode } from "react";

interface PotViewProps {
  readonly pot: Pot;
  readonly pending: boolean;
  readonly needsRefresh: boolean;
  readonly onRefresh: () => void;
  readonly onPay: () => void;
}

export function PotView({ pot, pending, needsRefresh, onRefresh, onPay }: PotViewProps): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <PotSummary pot={pot} />
      {pot.status === "settled" ? null : (
        <section className="flex flex-col gap-4" aria-labelledby="deposit-heading">
          <h2 id="deposit-heading" className="text-xl font-semibold">
            2. Pay into the pot
          </h2>
          {pot.participants
            .filter((participant) => participant.payInSat > 0)
            .map((participant) => (
              <DepositCard key={participant.userId} participant={participant} />
            ))}
        </section>
      )}
      <PayoutPanel pot={pot} pending={pending} needsRefresh={needsRefresh} onRefresh={onRefresh} onPay={onPay} />
    </div>
  );
}

import { SectionCard } from "@/components/section-card";
import { PayoutDestinations } from "@/components/settlement/payout-destinations";
import { PayoutReview } from "@/components/settlement/payout-review";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Pot } from "@/lib/pot";
import { potFullyFunded, payoutFundingMessage } from "@/lib/settlement";
import { useState } from "react";
import type { ReactNode } from "react";

interface PayoutProps {
  readonly pot: Pot;
  readonly pending: boolean;
  readonly needsRefresh: boolean;
  readonly onRefresh: () => void;
  readonly onPay: () => void;
}

export function PayoutPanel({ pot, pending, needsRefresh, onRefresh, onPay }: PayoutProps): ReactNode {
  const [reviewed, setReviewed] = useState(false);
  const fullyFunded = potFullyFunded(pot);
  const settled = pot.status === "settled";
  function pay(): void {
    setReviewed(false);
    onPay();
  }
  const fields = (
    <FieldGroup>
      <PayoutDestinations pot={pot} />
      {settled ? null : (
        <PayoutReview reviewed={reviewed} onChange={setReviewed} disabled={!fullyFunded || pending || needsRefresh} />
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {payoutFundingMessage(pot, needsRefresh)}
      </p>
    </FieldGroup>
  );
  const actions = (
    <>
      <Button type="button" variant="outline" disabled={pending} onClick={onRefresh}>
        {pending ? <Spinner data-icon="inline-start" /> : null} Check deposits / refresh
      </Button>
      {settled ? null : (
        <Button type="button" disabled={pending || !fullyFunded || !reviewed || needsRefresh} onClick={pay}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pot.status === "paying" ? "Reconcile / finish payouts" : `Pay out ${pot.totalSat.toLocaleString()} sats`}
        </Button>
      )}
    </>
  );
  return (
    <SectionCard
      title={settled ? "3. Settlement complete" : "3. Final payout"}
      description={
        settled
          ? "Bark has confirmed every outgoing payment. No further payout will be sent."
          : "Review the locked destinations. Funds are released only after every required deposit is confirmed by Bark."
      }
      footer={actions}
      footerClassName="flex flex-wrap gap-3"
    >
      {fields}
    </SectionCard>
  );
}

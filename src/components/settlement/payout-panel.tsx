import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{settled ? "3. Settlement complete" : "3. Final payout"}</CardTitle>
        <CardDescription>
          {settled
            ? "Bark has confirmed every outgoing payment. No further payout will be sent."
            : "Review the locked destinations. Funds are released only after every required deposit is confirmed by Bark."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {pot.participants
            .filter((participant) => participant.receiveSat > 0)
            .map((participant) => (
              <Field key={participant.userId}>
                <FieldLabel htmlFor={`payout-${participant.userId}`}>
                  {participant.name} receives {participant.receiveSat.toLocaleString()} sats
                </FieldLabel>
                <Input
                  id={`payout-${participant.userId}`}
                  value={participant.payoutAddress}
                  readOnly
                  spellCheck={false}
                />
                <FieldDescription>
                  {participant.payoutStatus === "paid"
                    ? "Payout confirmed by Bark."
                    : "Locked personal signet payout address."}
                </FieldDescription>
              </Field>
            ))}
          {settled ? null : (
            <Field orientation="horizontal" data-disabled={!fullyFunded || pending || needsRefresh}>
              <Checkbox
                id="review-payouts"
                checked={reviewed}
                onCheckedChange={setReviewed}
                disabled={!fullyFunded || pending || needsRefresh}
              />
              <FieldLabel htmlFor="review-payouts">I have reviewed the payout amounts and addresses.</FieldLabel>
            </Field>
          )}
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {payoutFundingMessage(pot, needsRefresh)}
          </p>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={onRefresh}>
          {pending ? <Spinner data-icon="inline-start" /> : null} Check deposits / refresh
        </Button>
        {settled ? null : (
          <Button type="button" disabled={pending || !fullyFunded || !reviewed || needsRefresh} onClick={pay}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pot.status === "paying" ? "Reconcile / finish payouts" : `Pay out ${pot.totalSat.toLocaleString()} sats`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

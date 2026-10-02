import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ReactNode } from "react";

interface PayoutReviewProps {
  readonly reviewed: boolean;
  readonly disabled: boolean;
  readonly onChange: (reviewed: boolean) => void;
}

export function PayoutReview({ reviewed, disabled, onChange }: PayoutReviewProps): ReactNode {
  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <Checkbox id="review-payouts" checked={reviewed} onCheckedChange={onChange} disabled={disabled} />
      <FieldLabel htmlFor="review-payouts">I have reviewed the payout amounts and addresses.</FieldLabel>
    </Field>
  );
}

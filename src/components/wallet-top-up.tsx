import { formatSats, MAX_SATS } from "@/domain/money";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { ContributionQr } from "./contribution-qr";
import { Button } from "./ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { useWalletTopUp } from "./use-wallet-top-up";

export function WalletTopUp({ inviteKey }: { readonly inviteKey: string }): ReactNode {
  const { amount, setAmount, invoice, valid, generate, ...action } = useWalletTopUp(inviteKey);
  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          generate();
        }}
      >
        <FieldGroup>
          <Field data-invalid={amount !== "" && !valid} data-disabled={action.pending}>
            <FieldLabel htmlFor="wallet-top-up-amount">Top-up amount (sats)</FieldLabel>
            <Input
              id="wallet-top-up-amount"
              type="number"
              min="1"
              max={MAX_SATS}
              step="1"
              required
              value={amount}
              disabled={action.pending}
              aria-invalid={amount !== "" && !valid}
              onChange={(event) => {
                setAmount(event.target.value);
              }}
            />
            <FieldDescription>Wallet funds only; does not pay a participant’s share.</FieldDescription>
          </Field>
          <Button type="submit" variant="outline" disabled={action.pending || !valid}>
            {action.pending ? "Generating…" : "Generate Lightning invoice"}
          </Button>
        </FieldGroup>
      </form>
      {invoice !== null && (
        <div className="flex flex-col gap-3">
          <p>Wallet top-up · {formatSats(invoice.amountSats)}</p>
          <ContributionQr invoice={invoice} title="Wallet top-up invoice" />
          <p className="text-sm text-muted-foreground">After paying, sync the wallet.</p>
        </div>
      )}
      <ActionError message={action.error} />
    </div>
  );
}

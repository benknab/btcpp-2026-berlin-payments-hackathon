import { formatSats } from "@/domain/money";
import { isPayoutDestination, MAX_PAYOUT_DESTINATION_LENGTH } from "@/domain/payout-destination";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { LabeledField } from "./labeled-field";
import { Button } from "./ui/button";
import { FieldGroup } from "./ui/field";
import { Input } from "./ui/input";
import { useWalletWithdrawal } from "./use-wallet-withdrawal";

export function WalletWithdrawal(props: {
  readonly inviteKey: string;
  readonly arkAddress: string;
  readonly ownerAddress: string;
  readonly settled: boolean;
  readonly onComplete: () => void;
}): ReactNode {
  const action = useWalletWithdrawal(props);
  const reconciling = action.withdrawal?.status === "sending";
  const disabled = action.pending || reconciling || !props.settled;
  return (
    <FieldGroup className="gap-3">
      <LabeledField id="withdrawal-destination" label="Owner wallet" disabled={disabled}>
        <Input
          id="withdrawal-destination"
          value={reconciling ? action.withdrawal.destination : action.destination}
          disabled={disabled}
          maxLength={MAX_PAYOUT_DESTINATION_LENGTH}
          placeholder="name@wallet.com, lnurl1…, ark1…, or lno1…"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            action.setDestination(event.target.value);
          }}
        />
      </LabeledField>
      <Button
        variant="outline"
        disabled={
          action.pending || (!reconciling && (!props.settled || !isPayoutDestination(action.destination.trim())))
        }
        onClick={() => {
          action.withdraw();
        }}
      >
        {action.pending ? "Withdrawing…" : null}
        {!action.pending && (reconciling ? "Reconcile withdrawal" : "Withdraw max")}
      </Button>
      {!props.settled && <p className="text-sm text-muted-foreground">Available after settlement.</p>}
      {action.withdrawal?.status === "paid" && <p>Withdrawn: {formatSats(action.withdrawal.amountSats)}</p>}
      <ActionError message={action.error} />
    </FieldGroup>
  );
}

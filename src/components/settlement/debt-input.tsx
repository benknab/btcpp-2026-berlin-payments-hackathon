import { DebtAmountField } from "@/components/settlement/debt-amount-field";
import { DebtPartyField } from "@/components/settlement/debt-party-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { validDraftAmount } from "@/lib/settlement-draft";
import type { DraftDebt, DraftUser } from "@/lib/settlement-draft";
import { Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

interface DebtProps {
  readonly debt: DraftDebt;
  readonly users: readonly DraftUser[];
  readonly pending: boolean;
  readonly showErrors: boolean;
  readonly onChange: (debt: DraftDebt) => void;
  readonly onRemove: () => void;
}

export function DebtInput({ debt, users, pending, showErrors, onChange, onRemove }: DebtProps): ReactNode {
  const invalidParties = showErrors && (debt.from === debt.to || debt.from === "" || debt.to === "");
  const invalidAmount = showErrors && !validDraftAmount(debt.amount);
  return (
    <FieldGroup className="rounded-lg border p-4 sm:grid sm:grid-cols-3">
      <DebtPartyField
        id={`${debt.id}-from`}
        label="Who owes"
        value={debt.from}
        users={users}
        pending={pending}
        invalid={invalidParties}
        onChange={(from) => {
          onChange({ ...debt, from });
        }}
      />
      <DebtPartyField
        id={`${debt.id}-to`}
        label="Owes whom"
        value={debt.to}
        users={users}
        pending={pending}
        invalid={invalidParties}
        onChange={(to) => {
          onChange({ ...debt, to });
        }}
      />
      <DebtAmountField debt={debt} pending={pending} invalid={invalidAmount} onChange={onChange} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={pending}
        onClick={onRemove}
        aria-label="Remove debt"
      >
        <Trash2Icon data-icon="inline-start" /> Remove debt
      </Button>
    </FieldGroup>
  );
}

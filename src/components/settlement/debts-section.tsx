import { DebtInput } from "@/components/settlement/debt-input";
import type { DraftController } from "@/components/settlement/use-settlement-draft";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { canAddDraftDebt } from "@/lib/settlement-draft";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

export function DebtsSection({
  controller,
  pending,
}: Readonly<{ controller: DraftController; pending: boolean }>): ReactNode {
  return (
    <FieldSet>
      <FieldLegend>Who owes whom</FieldLegend>
      <FieldDescription>Amounts are whole sats. Add debts from your existing expense split.</FieldDescription>
      <FieldGroup>
        {controller.draft.debts.map((debt) => (
          <DebtInput
            key={debt.id}
            debt={debt}
            users={controller.draft.users}
            pending={pending}
            showErrors={controller.showErrors}
            onChange={controller.handleDebtChange}
            onRemove={(): void => {
              controller.handleDebtRemove(debt.id);
            }}
          />
        ))}
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={pending || !canAddDraftDebt(controller.draft)}
        onClick={controller.handleDebtAdd}
      >
        <PlusIcon data-icon="inline-start" /> Add debt
      </Button>
    </FieldSet>
  );
}

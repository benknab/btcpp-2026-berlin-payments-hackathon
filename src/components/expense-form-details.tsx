import { ActionError } from "@/components/action-error";
import { ExpenseFields } from "@/components/expense-fields";
import { ExpenseFormActions } from "@/components/expense-form-actions";
import { ExpenseSplitter } from "@/components/expense-splitter";
import { MessageAlert } from "@/components/message-alert";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import type { ExpenseFormOptions, ExpenseFormState } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
import type { ReactNode } from "react";

interface ExpenseFormDetailsProps {
  readonly options: ExpenseFormOptions;
  readonly form: ExpenseFormState;
  readonly participants: readonly ParticipantData[];
  readonly locked: boolean;
}

export function ExpenseFormDetails({ options, form, participants, locked }: ExpenseFormDetailsProps): ReactNode {
  return (
    <FieldSet disabled={locked}>
      <FieldLegend className="sr-only">Expense details</FieldLegend>
      <ExpenseFields form={form} participants={participants} />
      <Separator />
      <ExpenseSplitter
        split={form.split}
        participants={participants}
        disabled={locked || form.pending}
        showError={form.values.amount !== ""}
      />
      <ActionError message={form.error} />
      {form.success === null ? null : (
        <MessageAlert title="Expense saved">
          <output>{form.success}</output>
        </MessageAlert>
      )}
      <ExpenseFormActions
        inviteKey={options.inviteKey}
        pending={form.pending}
        disabled={locked || form.pending || form.split.error !== null}
        editing={options.existing !== null}
      />
    </FieldSet>
  );
}

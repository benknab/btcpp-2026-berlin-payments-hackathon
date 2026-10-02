import { ActionError } from "@/components/action-error";
import { ExpenseFields } from "@/components/expense-fields";
import { MessageAlert } from "@/components/message-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import type { ExpenseFormOptions, ExpenseFormState } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface ExpenseFormDetailsProps {
  readonly options: ExpenseFormOptions;
  readonly form: ExpenseFormState;
  readonly participants: readonly ParticipantData[];
  readonly locked: boolean;
}

export function ExpenseFormDetails({ options, form, participants, locked }: ExpenseFormDetailsProps): ReactNode {
  const submitLabel = options.existing === null ? "Add expense" : "Save changes";
  return (
    <FieldSet disabled={locked}>
      <FieldLegend className="sr-only">Expense details</FieldLegend>
      <ExpenseFields form={form} participants={participants} />
      <p className="text-sm text-muted-foreground">
        {options.existing === null
          ? `Split equally between all ${participants.length} participants.`
          : `Split equally between the original ${options.existing.shares.length} participants.`}
      </p>
      <ActionError message={form.error} />
      {form.success === null ? null : (
        <MessageAlert title="Expense saved">
          <output>{form.success}</output>
        </MessageAlert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={form.pending}>
          {form.pending ? "Saving…" : submitLabel}
        </Button>
        <Link
          to="/groups/$inviteKey"
          params={{ inviteKey: options.inviteKey }}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to event
        </Link>
      </div>
    </FieldSet>
  );
}

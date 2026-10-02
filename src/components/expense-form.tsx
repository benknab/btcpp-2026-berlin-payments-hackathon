import { ActionError } from "@/components/action-error";
import { ExpenseFields } from "@/components/expense-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { useExpenseForm } from "@/components/use-expense-form";
import type { ExpenseFormOptions } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function ExpenseForm({
  options,
  participants,
  locked,
}: {
  readonly options: ExpenseFormOptions;
  readonly participants: readonly ParticipantData[];
  readonly locked: boolean;
}): ReactNode {
  const form = useExpenseForm(options);
  const submitLabel = options.existing === null ? "Add expense" : "Save changes";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{options.existing === null ? "Add an expense" : "Edit expense"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-6">
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
              <Alert>
                <AlertTitle>Expense saved</AlertTitle>
                <AlertDescription>
                  <output>{form.success}</output>
                </AlertDescription>
              </Alert>
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
          {locked ? (
            <p className="text-sm text-muted-foreground">Settlement has started. Expenses can no longer be changed.</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

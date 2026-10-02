import { ExpenseFormDetails } from "@/components/expense-form-details";
import { SectionCard } from "@/components/section-card";
import { useExpenseForm } from "@/components/use-expense-form";
import type { ExpenseFormOptions } from "@/components/use-expense-form";
import type { ParticipantData } from "@/db/groups";
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
  const form = useExpenseForm(options, participants);
  return (
    <SectionCard title={options.existing === null ? "Add expense" : "Edit expense"} className="w-full max-w-2xl">
      <form onSubmit={form.handleSubmit} className="flex flex-col gap-6">
        <ExpenseFormDetails options={options} form={form} participants={participants} locked={locked} />
        {locked ? (
          <p className="text-sm text-muted-foreground">Settlement has started. Expenses can no longer be changed.</p>
        ) : null}
      </form>
    </SectionCard>
  );
}

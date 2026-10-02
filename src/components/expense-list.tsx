import { EmptyState } from "@/components/empty-state";
import { ExpenseListItem } from "@/components/expense-list-item";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function ExpenseList({
  inviteKey,
  entries,
  participants,
  selectedParticipantId,
  locked,
}: {
  readonly inviteKey: string;
  readonly entries: readonly ExpenseView[];
  readonly participants: readonly ParticipantData[];
  readonly selectedParticipantId: string | null;
  readonly locked: boolean;
}): ReactNode {
  return (
    <SectionCard title="Expenses" contentClassName="flex flex-col gap-4">
      {entries.length === 0 ? (
        <EmptyState title="No expenses" />
      ) : (
        <ul className="flex flex-col divide-y">
          {entries.map((expense) => (
            <ExpenseListItem
              key={expense.id}
              inviteKey={inviteKey}
              expense={expense}
              participants={participants}
              selectedParticipantId={selectedParticipantId}
            />
          ))}
        </ul>
      )}
      {locked ? null : (
        <Link
          to="/groups/$inviteKey/expenses/new"
          params={{ inviteKey }}
          className={buttonVariants({ className: "self-start" })}
        >
          Add expense
        </Link>
      )}
    </SectionCard>
  );
}

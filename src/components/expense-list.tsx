import { EmptyState } from "@/components/empty-state";
import { ExpenseListItem } from "@/components/expense-list-item";
import { ExpenseSearch } from "@/components/expense-search";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import { Link } from "@tanstack/react-router";
import { PlusIcon, ReceiptTextIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

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
  const [query, setQuery] = useState("");
  const matches = entries.filter((expense) =>
    [expense.description, expense.date, participants.find((person) => person.id === expense.payerId)?.name ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <SectionCard
      title="Expenses"
      contentClassName="flex flex-col gap-4"
      action={
        !locked && (
          <Link to="/groups/$inviteKey/expenses/new" params={{ inviteKey }} className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Add expense
          </Link>
        )
      }
    >
      {entries.length > 0 && <ExpenseSearch query={query} onChange={setQuery} />}
      {matches.length === 0 ? (
        <EmptyState title={entries.length === 0 ? "No expenses yet" : "No matching expenses"} icon={ReceiptTextIcon} />
      ) : (
        <ul className="flex flex-col divide-y">
          {matches.map((expense) => (
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
    </SectionCard>
  );
}
